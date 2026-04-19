"""Fetch Taiwan stock-specific news via Yahoo Finance."""

import asyncio
from datetime import datetime, timezone
from typing import Optional

import yfinance as yf
from loguru import logger
from cachetools import TTLCache


# 15-minute cache per stock
news_cache: TTLCache = TTLCache(maxsize=500, ttl=900)


def _get_ticker_symbol(stock_id: str) -> str:
    """Convert stock ID to yfinance ticker symbol."""
    return f"{stock_id}.TW"


def _format_pub_date(date_str: str) -> str:
    """Format ISO date string (e.g. '2026-04-19T12:30:15Z') to short form."""
    if not date_str:
        return ""
    try:
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        return dt.strftime("%m/%d %H:%M")
    except Exception:
        return date_str[:16]


def _extract_news_item(entry: dict) -> Optional[dict]:
    """Extract news fields from yfinance news entry (new format with nested content)."""
    content = entry.get("content") or entry

    title = content.get("title", "")
    if not title:
        return None

    # Provider / publisher
    provider = content.get("provider", {})
    source = provider.get("displayName", "") if isinstance(provider, dict) else ""

    # Published date
    pub_date = content.get("pubDate", "") or content.get("displayTime", "")
    published = _format_pub_date(pub_date)

    # Link
    click_url = content.get("clickThroughUrl", {})
    canonical_url = content.get("canonicalUrl", {})
    link = ""
    if isinstance(click_url, dict):
        link = click_url.get("url", "")
    if not link and isinstance(canonical_url, dict):
        link = canonical_url.get("url", "")

    return {
        "title": title,
        "source": source,
        "published": published,
        "link": link,
    }


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
                # Try alternate market suffix (OTC stocks)
                alt_sym = f"{stock_id}.TWO"

                def _fetch_alt():
                    t = yf.Ticker(alt_sym)
                    return t.news or []

                raw_news = await loop.run_in_executor(None, _fetch_alt)

            if not raw_news:
                logger.debug(f"No news found for {stock_id} ({stock_name})")
                news_cache[cache_key] = []
                return []

            items = []
            for entry in raw_news:
                if len(items) >= limit:
                    break
                item = _extract_news_item(entry)
                if item:
                    items.append(item)

            news_cache[cache_key] = items
            return items

        except Exception as e:
            logger.warning(f"Failed to fetch news for {stock_id}: {e}")
            return []
