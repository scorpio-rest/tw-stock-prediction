"""Fetch Taiwan stock-specific news via CNYES (鉅亨網) API."""

import re
from datetime import datetime, timezone

import httpx
from loguru import logger
from cachetools import TTLCache


# 15-minute cache per stock
news_cache: TTLCache = TTLCache(maxsize=500, ttl=900)

_CNYES_SEARCH_URL = "https://api.cnyes.com/media/api/v1/search"

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/125.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json",
}


def _format_timestamp(ts: int) -> str:
    """Format Unix timestamp to short date string."""
    try:
        dt = datetime.fromtimestamp(ts, tz=timezone.utc)
        return dt.strftime("%m/%d %H:%M")
    except Exception:
        return ""


def _strip_html(text: str) -> str:
    """Remove HTML tags like <mark> from text."""
    return re.sub(r"<[^>]+>", "", text)


class NewsService:
    """Fetches stock-specific news from CNYES (鉅亨網)."""

    async def get_stock_news(
        self,
        stock_id: str,
        stock_name: str = "",
        limit: int = 5,
    ) -> list[dict]:
        """
        Get the latest news for a specific stock via CNYES search API.

        - Search by stock code (e.g. "2330")
        - 15-minute cache per stock
        - Returns up to `limit` items
        """
        cache_key = f"news:{stock_id}:{limit}"
        if cache_key in news_cache:
            return news_cache[cache_key]

        try:
            async with httpx.AsyncClient(
                headers=_HEADERS,
                timeout=10.0,
            ) as client:
                resp = await client.get(
                    _CNYES_SEARCH_URL,
                    params={"q": stock_id, "limit": limit},
                )
                resp.raise_for_status()
                data = resp.json()

            raw_items = data.get("items", {}).get("data", [])

            if not raw_items:
                logger.debug(f"No news found for {stock_id} ({stock_name})")
                news_cache[cache_key] = []
                return []

            items = []
            for entry in raw_items[:limit]:
                title = _strip_html(entry.get("title", ""))
                if not title:
                    continue

                published = ""
                if entry.get("publishAt"):
                    published = _format_timestamp(entry["publishAt"])

                news_id = entry.get("newsId", "")
                link = f"https://news.cnyes.com/news/id/{news_id}" if news_id else ""

                items.append({
                    "title": title,
                    "source": entry.get("categoryName", "鉅亨網"),
                    "published": published,
                    "link": link,
                })

            news_cache[cache_key] = items
            return items

        except Exception as e:
            logger.warning(f"Failed to fetch news for {stock_id}: {e}")
            return []
