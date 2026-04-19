"""Fetch Taiwan stock-specific news via Google News RSS."""

import asyncio
import re
from urllib.parse import quote
from urllib.request import Request, urlopen
from datetime import datetime
from typing import Optional

import feedparser
from loguru import logger
from cachetools import TTLCache


# 15-minute cache per stock
news_cache: TTLCache = TTLCache(maxsize=500, ttl=900)

# Google blocks requests from datacenter IPs without a browser User-Agent
_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/125.0.0.0 Safari/537.36"
)


def _clean_title(title: str) -> str:
    """Remove source suffix Google News adds (e.g. ' - 經濟日報')."""
    # Google News often appends " - Source Name" to titles
    title = re.sub(r"\s*-\s*[^-]+$", "", title).strip()
    return title


def _extract_source(entry) -> str:
    """Extract source name from a feedparser entry."""
    if hasattr(entry, "source") and hasattr(entry.source, "title"):
        return entry.source.title
    # Fallback: parse from title tail
    title = entry.get("title", "")
    m = re.search(r"\s*-\s*([^-]+)$", title)
    if m:
        return m.group(1).strip()
    return ""


def _format_published(published_str: str) -> str:
    """Format published date to short Chinese form."""
    if not published_str:
        return ""
    try:
        # Google News RSS format: "Wed, 09 Apr 2026 14:32:00 GMT"
        dt = datetime.strptime(published_str, "%a, %d %b %Y %H:%M:%S %Z")
        return dt.strftime("%m/%d %H:%M")
    except Exception:
        return published_str[:16]


class NewsService:
    """Fetches stock-specific news from Google News RSS."""

    async def get_stock_news(
        self,
        stock_id: str,
        stock_name: str = "",
        limit: int = 5,
    ) -> list[dict]:
        """
        Get the latest news for a specific stock.

        Query pattern: "{stock_id} {stock_name}" (e.g. "2330 台積電")
        - Uses Google News RSS (no API key required)
        - 15-minute cache per stock
        - Returns up to `limit` items
        """
        cache_key = f"news:{stock_id}:{limit}"
        if cache_key in news_cache:
            return news_cache[cache_key]

        # Build query: code + name for better relevance
        query_parts = [stock_id]
        if stock_name and stock_name != stock_id:
            query_parts.append(stock_name)
        query = " ".join(query_parts)

        url = (
            f"https://news.google.com/rss/search?"
            f"q={quote(query)}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant"
        )

        try:
            # feedparser is sync — run in executor to avoid blocking.
            # We fetch via urllib with a browser User-Agent first,
            # because Google blocks default feedparser requests from datacenter IPs.
            def _fetch_and_parse():
                req = Request(url, headers={"User-Agent": _USER_AGENT})
                with urlopen(req, timeout=10) as resp:
                    return feedparser.parse(resp.read())

            loop = asyncio.get_event_loop()
            feed = await loop.run_in_executor(None, _fetch_and_parse)

            if not feed.entries:
                logger.debug(f"No news found for {stock_id} ({stock_name})")
                news_cache[cache_key] = []
                return []

            items = []
            for entry in feed.entries[:limit]:
                title = _clean_title(entry.get("title", ""))
                if not title:
                    continue
                items.append({
                    "title": title,
                    "source": _extract_source(entry),
                    "published": _format_published(entry.get("published", "")),
                    "link": entry.get("link", ""),
                })

            news_cache[cache_key] = items
            return items

        except Exception as e:
            logger.warning(f"Failed to fetch news for {stock_id}: {e}")
            return []
