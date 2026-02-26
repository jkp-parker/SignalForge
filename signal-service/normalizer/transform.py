import logging
from typing import Any

from normalizer.schema import CanonicalAlarmEvent, AlarmLabels, AlarmMetadata

logger = logging.getLogger("signal-service.normalizer")


def normalize_ignition_alarm(raw: dict[str, Any], connector_id: str, source: str) -> CanonicalAlarmEvent:
    """Transform an Ignition alarm journal entry into canonical form."""
    from datetime import datetime, timezone

    # Map Ignition priority (0-4) to ISA priority labels
    priority_map = {0: "diagnostic", 1: "high", 2: "medium", 3: "low", 4: "low"}
    priority_val = raw.get("priority", 4)

    return CanonicalAlarmEvent(
        timestamp=datetime.fromisoformat(raw.get("eventTime", datetime.now(timezone.utc).isoformat())),
        labels=AlarmLabels(
            source=source,
            severity=raw.get("severity", "info"),
            area=raw.get("area", raw.get("displayPath", "unknown")),
            equipment=raw.get("source", "unknown"),
            alarm_type=raw.get("name", "generic"),
            connector_id=connector_id,
            isa_priority=priority_map.get(priority_val, "low"),
        ),
        message=raw.get("label", raw.get("name", "Unknown alarm")),
        metadata=AlarmMetadata(
            value=raw.get("currentValue"),
            threshold=raw.get("setpointValue"),
            state=raw.get("eventState", "ACTIVE"),
            priority=priority_val,
            vendor_alarm_id=raw.get("id", ""),
            ack_required=raw.get("ackRequired", True),
            shelved=raw.get("shelved", False),
        ),
    )
