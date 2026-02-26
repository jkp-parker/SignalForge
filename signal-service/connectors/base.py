from abc import ABC, abstractmethod
from typing import Any


class BaseConnector(ABC):
    """Abstract base class for all SCADA alarm connectors."""

    def __init__(self, config: dict[str, Any]):
        self.config = config
        self.host = config.get("host", "")
        self.port = config.get("port", 0)
        self.credentials = config.get("credentials", {})
        self.connection_params = config.get("connection_params", {})

    @abstractmethod
    async def connect(self) -> bool:
        """Establish connection to the SCADA system."""
        ...

    @abstractmethod
    async def disconnect(self) -> None:
        """Close connection to the SCADA system."""
        ...

    @abstractmethod
    async def fetch_alarms(self, since: str | None = None) -> list[dict[str, Any]]:
        """Fetch alarm events since the given timestamp."""
        ...

    @abstractmethod
    async def health_check(self) -> dict[str, Any]:
        """Check connector health and return status info."""
        ...
