import logging
from typing import Any

from connectors.base import BaseConnector

logger = logging.getLogger("signal-service.connectors.wincc")


class WinCCConnector(BaseConnector):
    """Connector for Siemens WinCC — Phase 5 stub."""

    async def connect(self) -> bool:
        raise NotImplementedError("WinCC connector not yet implemented")

    async def disconnect(self) -> None:
        pass

    async def fetch_alarms(self, since: str | None = None) -> list[dict[str, Any]]:
        raise NotImplementedError("WinCC connector not yet implemented")

    async def health_check(self) -> dict[str, Any]:
        return {"connector_type": "wincc", "status": "not_implemented"}
