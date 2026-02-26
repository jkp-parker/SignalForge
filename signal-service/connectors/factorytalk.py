import logging
from typing import Any

from connectors.base import BaseConnector

logger = logging.getLogger("signal-service.connectors.factorytalk")


class FactoryTalkConnector(BaseConnector):
    """Connector for Rockwell Automation FactoryTalk — Phase 5 stub."""

    async def connect(self) -> bool:
        raise NotImplementedError("FactoryTalk connector not yet implemented")

    async def disconnect(self) -> None:
        pass

    async def fetch_alarms(self, since: str | None = None) -> list[dict[str, Any]]:
        raise NotImplementedError("FactoryTalk connector not yet implemented")

    async def health_check(self) -> dict[str, Any]:
        return {"connector_type": "factorytalk", "status": "not_implemented"}
