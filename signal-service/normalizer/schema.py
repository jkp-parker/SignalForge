from datetime import datetime
from typing import Any

from pydantic import BaseModel


class AlarmLabels(BaseModel):
    source: str
    severity: str = "info"
    area: str = "unknown"
    equipment: str = "unknown"
    alarm_type: str = "generic"
    connector_id: str = ""
    isa_priority: str = "low"


class AlarmMetadata(BaseModel):
    value: float | None = None
    threshold: float | None = None
    unit: str = ""
    state: str = "ACTIVE"
    priority: int = 4
    vendor_alarm_id: str = ""
    ack_required: bool = True
    shelved: bool = False


class CanonicalAlarmEvent(BaseModel):
    """Canonical alarm event schema — all vendor alarms normalize to this."""
    timestamp: datetime
    labels: AlarmLabels
    message: str
    metadata: AlarmMetadata = AlarmMetadata()

    def to_loki_payload(self) -> dict[str, Any]:
        return {
            "labels": self.labels.model_dump(),
            "message": self.message,
            "metadata": self.metadata.model_dump(),
            "timestamp_ns": int(self.timestamp.timestamp() * 1_000_000_000),
        }
