"""Signal analysis, composite scoring, predict, and AI toggle endpoints."""

import re
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.schemas import APIResponse, AIToggleRequest, AISettingsUpdateRequest
from services.signal_engine import SignalEngine
from services.quote_service import QuoteService
from services.ai_analysis import AIAnalysisService
from services.news_service import NewsService
from services.prediction_service import PredictionService

router = APIRouter(prefix="/analysis", tags=["analysis"])

signal_engine = SignalEngine()
quote_service = QuoteService()
ai_service = AIAnalysisService()
news_service = NewsService()
prediction_service = PredictionService(quote_service)


def _infer_ai_score_from_text(reasoning: str) -> Optional[int]:
    """Infer a numeric score from AI reasoning text by keyword analysis.

    Scans for bullish/bearish keywords and intensity modifiers to estimate
    an AI score when [SCORE:X] is unavailable (e.g. cached results).
    """
    if not reasoning:
        return None

    text = reasoning[:200]  # Only scan the beginning where conclusion usually is

    # Strong bullish patterns
    strong_bull = re.search(r"強烈看漲|強勢反彈|大幅上漲|顯著看漲", text)
    # Normal bullish patterns
    bull = re.search(r"走勢看漲|預期.*看漲|判斷.*看漲|方向.*看漲|偏多|反彈向上|帶動.*上", text)
    # Mild bullish
    mild_bull = re.search(r"微幅看漲|小幅看漲|略偏多", text)

    # Strong bearish patterns
    strong_bear = re.search(r"強烈看跌|大幅下跌|顯著看跌", text)
    # Normal bearish patterns
    bear = re.search(r"走勢看跌|預期.*看跌|判斷.*看跌|方向.*看跌|偏空|持續下探", text)
    # Mild bearish
    mild_bear = re.search(r"微幅看跌|小幅看跌|略偏空", text)

    # Neutral
    neutral = re.search(r"中性|盤整|觀望|方向不明", text)

    if strong_bull:
        return 50
    if bull:
        return 30
    if mild_bull:
        return 15
    if strong_bear:
        return -50
    if bear:
        return -30
    if mild_bear:
        return -15
    if neutral:
        return 0

    # Last resort: simple keyword count
    bull_count = len(re.findall(r"看漲|上漲|反彈|偏多|利多", text))
    bear_count = len(re.findall(r"看跌|下跌|回落|偏空|利空", text))
    if bull_count > bear_count:
        return 25
    if bear_count > bull_count:
        return -25

    return None


def _adaptive_ai_weight(signals) -> float:
    """
    Calculate AI weight adaptively based on signal agreement.

    Logic:
    - If signals strongly agree (e.g., 13/15 same direction), the fixed-weight
      sum is already reliable → AI weight stays low (0.30).
    - If signals heavily conflict (e.g., 8 bullish vs 7 bearish), the linear
      sum is noisy → AI reasoning is more valuable → AI weight goes up (0.55).

    This lets AI's non-linear judgment (e.g., "institutional buying overrides
    RSI overbought") have more impact when signals contradict each other.
    """
    if not signals:
        return 0.40  # fallback to original weight

    scores = [s.score for s in signals]
    n = len(scores)
    bullish = sum(1 for s in scores if s > 5)
    bearish = sum(1 for s in scores if s < -5)
    # Agreement ratio: how dominant is the majority direction?
    majority = max(bullish, bearish)
    agreement_ratio = majority / n if n > 0 else 0.5

    # Map agreement_ratio to AI weight:
    # agreement_ratio ~1.0 (strong consensus) → AI weight 0.30
    # agreement_ratio ~0.5 (50/50 split)      → AI weight 0.55
    #
    # Linear interpolation: ai_weight = 0.55 - (agreement_ratio - 0.5) * 0.50
    ai_weight = 0.55 - (agreement_ratio - 0.5) * 0.50
    return max(0.25, min(0.55, ai_weight))


# Horizon code → human-readable label
HORIZON_LABELS: dict[str, str] = {
    "1d": "1日",
    "3d": "3日",
    "1w": "1週",
    "2w": "2週",
    "1mo": "1個月",
}

# Horizon uncertainty factor: longer horizon → lower confidence
# Confidence is multiplied by this factor
HORIZON_CONFIDENCE_FACTOR: dict[str, float] = {
    "1d": 1.00,   # short-term, highest confidence
    "3d": 0.92,
    "1w": 0.82,
    "2w": 0.72,
    "1mo": 0.60,  # long-term, lowest confidence
}


@router.get("/{stock_id}/signals")
async def get_signals(stock_id: str):
    """Get 15-signal scores for a stock."""
    market_data = await quote_service.get_market_data(stock_id)
    composite = await signal_engine.evaluate(market_data)
    return APIResponse(data={
        "stock_id": composite.stock_id,
        "stock_name": composite.stock_name,
        "total_score": composite.total_score,
        "direction": composite.direction,
        "confidence": composite.confidence,
        "signal_agreement": composite.signal_agreement,
        "signals": [
            {
                "name": s.name,
                "value": s.value,
                "score": s.score,
                "weight": s.weight,
                "weighted_score": s.weighted_score,
                "description": s.description,
                "reliability": s.reliability,
            }
            for s in composite.signals
        ],
        "calculated_at": composite.calculated_at,
    })


@router.get("/{stock_id}/composite")
async def get_composite(
    stock_id: str,
    horizon: str = Query("1w", pattern="^(1d|3d|1w|2w|1mo)$"),
    include_news: bool = Query(True),
    include_fundamentals: bool = Query(True),
):
    """Get composite analysis (signals + fundamentals + news + AI reasoning) for the given horizon."""
    import asyncio

    # Fetch market data first (needed for composite)
    market_data = await quote_service.get_market_data(stock_id)
    composite = await signal_engine.evaluate(market_data)

    # Parallel fetch: quote, news, fundamentals
    tasks = [quote_service.get_quote(stock_id)]
    if include_news:
        tasks.append(news_service.get_stock_news(stock_id, composite.stock_name, limit=5))
    if include_fundamentals:
        tasks.append(quote_service.get_fundamentals(stock_id))

    results = await asyncio.gather(*tasks, return_exceptions=True)

    quote = results[0] if not isinstance(results[0], Exception) else {}
    idx = 1
    news = []
    if include_news:
        news = results[idx] if not isinstance(results[idx], Exception) else []
        idx += 1
    fundamentals = {}
    if include_fundamentals:
        fundamentals = results[idx] if not isinstance(results[idx], Exception) else {}

    change_pct = quote.get("change_percent", 0)

    signals_dicts = [
        {
            "name": s.name,
            "value": s.value,
            "score": s.score,
            "weight": s.weight,
            "weighted_score": s.weighted_score,
            "description": s.description,
            "reliability": s.reliability,
        }
        for s in composite.signals
    ]

    # Adjust confidence by horizon uncertainty factor
    horizon_label = HORIZON_LABELS[horizon]
    confidence_factor = HORIZON_CONFIDENCE_FACTOR[horizon]
    adjusted_confidence = round(composite.confidence * confidence_factor, 1)

    # AI analysis now runs on frontend with user's own API key
    signal_score = composite.total_score
    ai_result = {
        "available": False,
        "reasoning": "",
        "message": "AI 分析已移至前端執行，請在設定頁面填入您的 Gemini API Key",
        "horizon": horizon_label,
        "model": "",
    }
    blended_score = signal_score
    ai_w = 0.0
    blended_direction = composite.direction

    return APIResponse(data={
        "stock_id": composite.stock_id,
        "stock_name": composite.stock_name,
        "current_price": market_data.current_price,
        "change_pct": change_pct,
        "horizon": horizon,
        "horizon_label": horizon_label,
        "composite_score": {
            "total_score": blended_score,
            "signal_score": signal_score,
            "ai_score": None,
            "ai_weight": round(ai_w, 2),
            "direction": blended_direction,
            "confidence": adjusted_confidence,
            "signal_agreement": composite.signal_agreement,
            "calculated_at": composite.calculated_at,
        },
        "signals": signals_dicts,
        "fundamentals": fundamentals,
        "news": news,
        "ai_analysis": ai_result,
    })


@router.post("/{stock_id}/predict")
async def create_prediction(
    stock_id: str,
    horizon: str = Query("1w", pattern="^(1d|3d|1w|2w|1mo)$"),
    db: AsyncSession = Depends(get_db),
):
    """Create a new price prediction with horizon-based verification."""
    market_data = await quote_service.get_market_data(stock_id)
    composite = await signal_engine.evaluate(market_data)

    prediction = await prediction_service.create_prediction(
        db=db,
        stock_id=stock_id,
        stock_name=composite.stock_name,
        direction=composite.direction,
        confidence=composite.confidence,
        price=market_data.current_price,
        signal_score=composite.total_score,
        ai_involved=False,
        horizon=horizon,
    )

    return APIResponse(data=prediction)


@router.post("/ai/toggle")
async def toggle_ai(request: AIToggleRequest):
    """Toggle AI analysis on/off."""
    if request.enabled:
        ai_service.enable()
    else:
        ai_service.disable("使用者手動關閉")
    return APIResponse(data=ai_service.status())


@router.get("/ai/status")
async def get_ai_status():
    """Get AI service status."""
    return APIResponse(data=ai_service.status())


@router.get("/ai/settings")
async def get_ai_settings():
    """Get current AI settings (API key masked)."""
    config = ai_service.get_config()
    return APIResponse(data=config)


@router.put("/ai/settings")
async def update_ai_settings(request: AISettingsUpdateRequest):
    """Update AI settings (API key, model)."""
    ai_service.update_config(
        api_key=request.api_key,
        model=request.model,
    )
    config = ai_service.get_config()
    return APIResponse(data=config)
