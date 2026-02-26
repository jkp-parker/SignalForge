import json
import time
from typing import Any

import httpx

from app.core.config import settings


class LokiClient:
    def __init__(self, base_url: str | None = None):
        self.base_url = (base_url or settings.LOKI_URL).rstrip("/")

    async def push(self, labels: dict[str, str], message: str, metadata: dict | None = None, timestamp_ns: int | None = None) -> bool:
        ts = timestamp_ns or int(time.time() * 1_000_000_000)
        line = message
        if metadata:
            line = json.dumps({"message": message, **metadata})

        payload = {
            "streams": [
                {
                    "stream": labels,
                    "values": [[str(ts), line]],
                }
            ]
        }

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}/loki/api/v1/push",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=10.0,
            )
            return resp.status_code == 204

    async def query(self, query: str, limit: int = 100, start: str | None = None, end: str | None = None) -> dict[str, Any]:
        params: dict[str, Any] = {"query": query, "limit": limit}
        if start:
            params["start"] = start
        if end:
            params["end"] = end

        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.base_url}/loki/api/v1/query_range",
                params=params,
                timeout=30.0,
            )
            resp.raise_for_status()
            return resp.json()

    async def query_instant(self, query: str, limit: int = 100) -> dict[str, Any]:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.base_url}/loki/api/v1/query",
                params={"query": query, "limit": limit},
                timeout=30.0,
            )
            resp.raise_for_status()
            return resp.json()

    async def ready(self) -> bool:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(f"{self.base_url}/ready", timeout=5.0)
                return resp.status_code == 200
        except Exception:
            return False


loki_client = LokiClient()
