"""FastAPI application entry point with lifespan management."""

import sys
import os
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger

# Ensure backend directory is on the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import get_settings
from database import init_database, close_database, AsyncSessionLocal
from core.ws_manager import ws_manager
from core.scheduler import scheduler
from core.exceptions import AppError
from services.quote_service import QuoteService
from services.prediction_service import PredictionService
from services.portfolio_service import PortfolioService

settings = get_settings()

# Configure loguru
logger.remove()
logger.add(
    sys.stderr,
    level="DEBUG" if settings.DEBUG else "INFO",
    format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | {message}",
)


# ─── Background Jobs ──────────────────────────────────────────────

quote_service = QuoteService()
prediction_service = PredictionService(quote_service)
portfolio_service = PortfolioService(quote_service)


async def verify_predictions_job():
    """Scheduled job: verify predictions whose horizon has elapsed."""
    async with AsyncSessionLocal() as db:
        try:
            await prediction_service.verify_pending(db)
        except Exception as e:
            logger.error(f"Prediction verification error: {e}")


async def push_quotes_job():
    """Scheduled job: push quote updates to subscribed WebSocket clients."""
    subscribed = ws_manager.get_subscribed_stocks()
    for stock_id in subscribed:
        try:
            quote = await quote_service.get_quote(stock_id)
            await ws_manager.broadcast_to_stock(stock_id, {
                "type": "quote_update",
                "data": quote,
            })
        except Exception as e:
            logger.error(f"Quote push error for {stock_id}: {e}")


# ─── Lifespan ─────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle."""
    # === Startup ===
    logger.info("Starting 台股實驗預測及模擬倉 backend...")

    # 1. Ensure data directory exists (for SQLite)
    db_url = settings.DATABASE_URL
    if "sqlite" in db_url:
        import re
        m = re.search(r"sqlite.*:///(.+)", db_url)
        if m:
            db_path = os.path.dirname(m.group(1))
            if db_path:
                os.makedirs(db_path, exist_ok=True)
                logger.info(f"Ensured data directory: {db_path}")

    # 2. Initialize database
    await init_database()
    logger.info("Database initialized")

    # 3. Create default user account
    async with AsyncSessionLocal() as db:
        await portfolio_service.ensure_default_account(db)
    logger.info("Default account ensured")

    # 4. Start scheduler
    scheduler.add_job(
        verify_predictions_job,
        "interval",
        seconds=settings.PREDICTION_INTERVAL,
        id="prediction_verify",
    )
    scheduler.add_job(
        push_quotes_job,
        "interval",
        seconds=settings.QUOTE_INTERVAL,
        id="quote_push",
    )
    scheduler.start()
    logger.info("Scheduler started")

    # 5. Start WebSocket heartbeat
    await ws_manager.start_heartbeat()
    logger.info("WebSocket heartbeat started")

    logger.info(f"Backend ready at http://{settings.APP_HOST}:{settings.APP_PORT}")

    yield

    # === Shutdown ===
    logger.info("Shutting down...")
    scheduler.shutdown(wait=False)
    await ws_manager.stop_heartbeat()
    await close_database()
    logger.info("Shutdown complete")


# ─── App Factory ──────────────────────────────────────────────────

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="台股即時分析與模擬交易平台 API",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Exception Handlers ──────────────────────────────────────────

@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(
        status_code=400,
        content={
            "success": False,
            "error": {"code": exc.code, "message": exc.message},
            "timestamp": datetime.now().isoformat(),
        },
    )


@app.exception_handler(Exception)
async def general_error_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {"code": "INTERNAL_ERROR", "message": "伺服器內部錯誤"},
            "timestamp": datetime.now().isoformat(),
        },
    )


# ─── Include Routers ──────────────────────────────────────────────

from api.v1.router import api_v1_router
from api.websocket import router as ws_router

app.include_router(api_v1_router)
app.include_router(ws_router)


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


# ─── Run ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.APP_HOST,
        port=settings.APP_PORT,
        reload=settings.DEBUG,
    )
