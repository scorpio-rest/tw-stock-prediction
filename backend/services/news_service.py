"""Fetch Taiwan stock-specific news via Yahoo Finance."""

import asyncio
import re
from datetime import datetime, timezone
from typing import Optional

import yfinance as yf
from loguru import logger
from cachetools import TTLCache


# 15-minute cache per stock
news_cache: TTLCache = TTLCache(maxsize=500, ttl=900)


def _get_ticker_symbol(stock_id: str) -> str:
    """Convert stock ID to yfinance ticker symbol."""
    if stock_id.startswith("0") and len(stock_id) == 4:
        return f"{stock_id}.TW"  # ETFs
    return f"{stock_id}.TW"


def _format_timestamp(ts: int) -> str:
    """Format Unix timestamp to short date string."""
    try:
        dt = datetime.fromtimestamp(ts, tz=timezone.utc)
        return dt.strftime("%m/%d %H:%M")
    except Exception:
        return ""


class NewsService:
    """Fetches stock-specific news from Yahoo Finance."""

    async def get_stock_news(
        self,
        stock_id: str,
        stock_name: str = "",
        limit: int = 5,
    ) -> list[dict]:
        """
        Get the latest news for a specific stock via yfinance.

        - Uses Yahoo Finance news (no API key required)
        - 15-minute cache per stock
        - Returns up to `limit` items
        """
        cache_key = f"news:{stock_id}:{limit}"
        if cache_key in news_cache:
            return news_cache[cache_key]

        try:
            ticker_sym = _get_ticker_symbol(stock_id)

            def _fetch():
                t = yf.Ticker(ticker_sym)
                return t.news or []

            loop = asyncio.get_event_loop()
            raw_news = await loop.run_in_executor(None, _fetch)

            if not raw_news:
                # Try alternate market suffix
                alt_sym = f"{stock_id}.TWO" if ticker_sym.endswith(".TW") else f"{stock_id}.TW"

                def _fetch_alt():
                    t = yf.Ticker(alt_sym)
                    return t.news or []

                raw_news = await loop.run_in_executor(None, _fetch_alt)

            if not raw_news:
                logger.debug(f"No news found for {stock_id} ({stock_name})")
                news_cache[cache_key] = []
                return []

            items = []
            for entry in raw_news[:limit]:
                title = entry.get("title", "")
                if not title:
                    continue

                published = ""
                if entry.get("providerPublishTime"):
                    published = _format_timestamp(entry["providerPublishTime"])

                items.append({
                    "title": title,
                    "source": entry.get("publisher", ""),
                    "published": published,
                    "link": entry.get("link", ""),
                })

            news_cache[cache_key] = items
            return items

        except Exception as e:
            logger.warning(f"Failed to fetch news for {stock_id}: {e}")
            return []
