import logging
from datetime import datetime, timezone
from typing import Any

from normalizer.schema import CanonicalAlarmEvent, AlarmLabels, AlarmMetadata

logger = logging.getLogger("signal-service.normalizer")

# Ignition eventtype int → string label
EVENT_TYPE_MAP = {0: "active", 1: "clear", 2: "ack"}

# Ignition priority int → ISA severity
PRIORITY_MAP = {0: "diagnostic", 1: "low", 2: "medium", 3: "high", 4: "critical"}


def _extract_area(displaypath: str) -> str:
    """Extract area from Ignition displaypath (first segment)."""
    parts = [p.strip() for p in displaypath.split("/") if p.strip()]
    return parts[0] if parts else "unknown"


def _extract_equipment(source: str) -> str:
    """Extract equipment identifier from Ignition source path.

    Source paths look like: prov:default:/tag:Boiler01/TempAlarm/alarms/HighTemp
    We extract the first tag segment after '/tag:'.
    """
    if "/tag:" in source:
        after_tag = source.split("/tag:", 1)[1]
        parts = after_tag.split("/")
        return parts[0] if parts else "unknown"
    return source or "unknown"


def normalize_ignition_alarm(raw: dict[str, Any], connector_id: str, source: str) -> CanonicalAlarmEvent:
    """Transform an Ignition alarm journal event into canonical form.

    Expected raw dict fields (from alarm_events + pivoted alarm_event_data):
      - eventtime: epoch milliseconds (int)
      - eventtype: 0=Active, 1=Clear, 2=Ack
      - eventid: UUID grouping related transitions
      - source: tag path
      - displaypath: human-readable path
      - priority: 0=Diagnostic, 1=Low, 2=Medium, 3=High, 4=Critical
      - name: alarm name (from event_data)
      - ackUser: acknowledging user (from event_data)
      - eventValue: alarm value (from event_data)
    """
    # Parse timestamp — Ignition 8.3+ sends TIMESTAMPTZ, older sends epoch ms
    eventtime = raw.get("eventtime")
    if isinstance(eventtime, datetime):
        ts = eventtime if eventtime.tzinfo else eventtime.replace(tzinfo=timezone.utc)
    elif isinstance(eventtime, str):
        try:
            ts = datetime.fromisoformat(eventtime)
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
        except ValueError:
            ts = datetime.now(timezone.utc)
    elif isinstance(eventtime, (int, float)) and eventtime > 0:
        ts = datetime.fromtimestamp(eventtime / 1000, tz=timezone.utc)
    else:
        ts = datetime.now(timezone.utc)

    # Map integer fields
    priority_int = raw.get("priority", 4)
    if not isinstance(priority_int, int):
        priority_int = 4
    eventtype_int = raw.get("eventtype", 0)
    if not isinstance(eventtype_int, int):
        eventtype_int = 0

    severity = PRIORITY_MAP.get(priority_int, "low")
    event_type = EVENT_TYPE_MAP.get(eventtype_int, "active")

    displaypath = str(raw.get("displaypath", ""))
    source_path = str(raw.get("source", ""))
    alarm_name = str(raw.get("name", raw.get("eventtype_label", "unknown")))

    # Parse value
    event_value = raw.get("eventValue")
    value_float = None
    if event_value is not None and event_value != "":
        try:
            value_float = float(event_value)
        except (ValueError, TypeError):
            pass

    return CanonicalAlarmEvent(
        timestamp=ts,
        labels=AlarmLabels(
            source=source,
            severity=severity,
            area=_extract_area(displaypath),
            equipment=_extract_equipment(source_path),
            alarm_type=alarm_name,
            connector_id=connector_id,
            isa_priority=severity,
            event_type=event_type,
        ),
        message=displaypath or alarm_name,
        metadata=AlarmMetadata(
            value=value_float,
            state=event_type.upper(),
            priority=priority_int,
            vendor_alarm_id=str(raw.get("eventid", "")),
            event_id=str(raw.get("eventid", "")),
            ack_user=str(raw.get("ackUser", "")),
            ack_required=True,
            shelved=False,
        ),
    )
