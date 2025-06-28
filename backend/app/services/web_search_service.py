"""
Web Search Service for integrating SerpAPI and Brave Search
"""
import os
import httpx
import asyncio
from typing import List, Dict, Optional, Any
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

class SearchResult(BaseModel):
    title: str
    url: str
    snippet: str
    source: str = "web"

class WebSearchService:
    def __init__(self):
        self.serpapi_key = os.getenv("SERPAPI_API_KEY")
        self.brave_key = os.getenv("BRAVE_API_KEY")
        self.provider = os.getenv("WEB_SEARCH_PROVIDER", "none").lower()
        
        # Validate configuration
        if self.provider == "serpapi" and not self.serpapi_key:
            logger.warning("SerpAPI provider selected but SERPAPI_API_KEY not found")
            self.provider = "none"
        elif self.provider == "brave" and not self.brave_key:
            logger.warning("Brave provider selected but BRAVE_API_KEY not found")
            self.provider = "none"
    
    async def search(self, query: str, max_results: int = 5) -> List[SearchResult]:
        """
        Perform web search using configured provider
        """
        if self.provider == "none":
            logger.info("Web search disabled - no provider configured")
            return []
        
        try:
            if self.provider == "serpapi":
                return await self._search_serpapi(query, max_results)
            elif self.provider == "brave":
                return await self._search_brave(query, max_results)
            else:
                logger.error(f"Unknown search provider: {self.provider}")
                return []
        except Exception as e:
            logger.error(f"Web search failed: {str(e)}")
            return []
    
    async def _search_serpapi(self, query: str, max_results: int) -> List[SearchResult]:
        """
        Search using SerpAPI Google Search
        """
        url = "https://serpapi.com/search"
        params = {
            "q": query,
            "api_key": self.serpapi_key,
            "engine": "google",
            "num": max_results,
            "format": "json"
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            results = []
            organic_results = data.get("organic_results", [])
            
            for result in organic_results[:max_results]:
                results.append(SearchResult(
                    title=result.get("title", ""),
                    url=result.get("link", ""),
                    snippet=result.get("snippet", ""),
                    source="serpapi"
                ))
            
            logger.info(f"SerpAPI search returned {len(results)} results for: {query}")
            return results
    
    async def _search_brave(self, query: str, max_results: int) -> List[SearchResult]:
        """
        Search using Brave Search API
        """
        url = "https://api.search.brave.com/res/v1/web/search"
        headers = {
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
            "X-Subscription-Token": self.brave_key
        }
        params = {
            "q": query,
            "count": max_results,
            "search_lang": "en",
            "country": "US",
            "safesearch": "moderate",
            "freshness": "pw"  # Past week
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=headers, params=params)
            response.raise_for_status()
            data = response.json()
            
            results = []
            web_results = data.get("web", {}).get("results", [])
            
            for result in web_results[:max_results]:
                results.append(SearchResult(
                    title=result.get("title", ""),
                    url=result.get("url", ""),
                    snippet=result.get("description", ""),
                    source="brave"
                ))
            
            logger.info(f"Brave search returned {len(results)} results for: {query}")
            return results
    
    def is_enabled(self) -> bool:
        """Check if web search is enabled and configured"""
        return self.provider != "none"
    
    def get_provider(self) -> str:
        """Get current search provider"""
        return self.provider
    
    async def search_and_format(self, query: str, max_results: int = 3) -> str:
        """
        Search and format results for LLM context
        """
        if not self.is_enabled():
            return ""
        
        results = await self.search(query, max_results)
        if not results:
            return ""
        
        formatted_results = []
        formatted_results.append("=== WEB SEARCH RESULTS ===")
        
        for i, result in enumerate(results, 1):
            formatted_results.append(f"\n{i}. {result.title}")
            formatted_results.append(f"   URL: {result.url}")
            formatted_results.append(f"   Summary: {result.snippet}")
        
        formatted_results.append("\n=== END WEB SEARCH RESULTS ===\n")
        
        return "\n".join(formatted_results)

# Global instance
web_search_service = WebSearchService()
