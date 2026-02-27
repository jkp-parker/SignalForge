"""
Alarm transformation configuration API.

Provides per-connector field mapping between vendor-specific raw alarm data
and the canonical SignalForge alarm schema before ingestion into Loki.
"""
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.connector import Connector
from app.models.user import User

router = APIRouter(prefix="/connectors", tags=["transform"])

# ---------------------------------------------------------------------------
# Vendor sample data
# For Ignition: alarm journal event format (from alarm_events + alarm_event_data)
# For others: vendor API format (Phase 5 stubs)
# ---------------------------------------------------------------------------

SAMPLE_DATA: dict[str, list[dict[str, Any]]] = {
    "ignition": [
        {
            "id": 1001,
            "eventid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            "source": "prov:default:/tag:Boiler01/TempAlarm/alarms/HighTemperature",
            "displaypath": "Plant A/Boiler Room/Boiler01/HighTemperature",
            "priority": 3,
            "eventtime": "2026-02-27T08:00:00+00",
            "eventtype": 0,
            "eventflags": 0,
            "name": "HighTemperature",
            "ackUser": "",
            "eventValue": "462.5",
            "eventtype_label": "Active",
        },
        {
            "id": 1002,
            "eventid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            "source": "prov:default:/tag:Boiler01/TempAlarm/alarms/HighTemperature",
            "displaypath": "Plant A/Boiler Room/Boiler01/HighTemperature",
            "priority": 3,
            "eventtime": "2026-02-27T08:02:00+00",
            "eventtype": 2,
            "eventflags": 0,
            "name": "HighTemperature",
            "ackUser": "operator1",
            "eventValue": "462.5",
            "eventtype_label": "Ack",
        },
        {
            "id": 1003,
            "eventid": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
            "source": "prov:default:/tag:Pump02/PressureAlarm/alarms/LowPressure",
            "displaypath": "Plant A/Pump Room/Pump02/LowPressure",
            "priority": 2,
            "eventtime": "2026-02-27T07:58:15+00",
            "eventtype": 0,
            "eventflags": 0,
            "name": "LowPressure",
            "ackUser": "",
            "eventValue": "12.3",
            "eventtype_label": "Active",
        },
        {
            "id": 1004,
            "eventid": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
            "source": "prov:default:/tag:Pump02/PressureAlarm/alarms/LowPressure",
            "displaypath": "Plant A/Pump Room/Pump02/LowPressure",
            "priority": 2,
            "eventtime": "2026-02-27T08:05:00+00",
            "eventtype": 1,
            "eventflags": 0,
            "name": "LowPressure",
            "ackUser": "",
            "eventValue": "15.1",
            "eventtype_label": "Clear",
        },
        {
            "id": 1005,
            "eventid": "c3d4e5f6-a7b8-9012-cdef-123456789012",
            "source": "prov:default:/tag:Conveyor01/DriveAlarm/alarms/MotorFault",
            "displaypath": "Plant A/Production Floor/Conveyor01/MotorFault",
            "priority": 4,
            "eventtime": "2026-02-27T07:45:00+00",
            "eventtype": 0,
            "eventflags": 0,
            "name": "MotorFault",
            "ackUser": "",
            "eventValue": "1.0",
            "eventtype_label": "Active",
        },
    ],
    "factorytalk": [
        {
            "AlarmId": "FT-2024-001",
            "TimeStamp": "2026-02-26T14:30:00.000",
            "AlarmName": "HIGH_TEMP_TK01",
            "Description": "Tank 01 temperature exceeded high limit",
            "Severity": "Critical",
            "Priority": "High",
            "Area": "TANK_FARM",
            "TagName": "TK01_TEMP_HH",
            "State": "Unacknowledged",
            "Value": 95.2,
            "Limit": 90.0,
            "Acknowledged": False,
        },
        {
            "AlarmId": "FT-2024-002",
            "TimeStamp": "2026-02-26T14:25:30.000",
            "AlarmName": "LOW_LEVEL_V02",
            "Description": "Vessel 02 level below low-low setpoint",
            "Severity": "Warning",
            "Priority": "Medium",
            "Area": "MIXING_AREA",
            "TagName": "V02_LVL_LL",
            "State": "Acknowledged",
            "Value": 8.5,
            "Limit": 10.0,
            "Acknowledged": True,
        },
        {
            "AlarmId": "FT-2024-003",
            "TimeStamp": "2026-02-26T14:10:00.000",
            "AlarmName": "VIBRATION_P03",
            "Description": "Pump 03 vibration above threshold",
            "Severity": "Warning",
            "Priority": "Low",
            "Area": "PUMP_STATION",
            "TagName": "P03_VIB",
            "State": "Unacknowledged",
            "Value": 12.7,
            "Limit": 10.0,
            "Acknowledged": False,
        },
    ],
    "wincc": [
        {
            "MessageNumber": 1234,
            "DateTime": "26.02.2026 14:30:00",
            "AlarmText": "Motor MU_01 overtemperature",
            "Class": "Error",
            "Priority": 12,
            "Unit": "MU_01",
            "Tag": "M01_TEMP",
            "State": "COME",
            "ProcessValue": 87.3,
            "Limit": 80.0,
            "EventId": "WCC-14302-MU01",
        },
        {
            "MessageNumber": 1235,
            "DateTime": "26.02.2026 14:27:45",
            "AlarmText": "PLC rack fault — communication lost",
            "Class": "Fault",
            "Priority": 16,
            "Unit": "PLC_02",
            "Tag": "PLC02_COMM",
            "State": "COME",
            "ProcessValue": 0.0,
            "Limit": 1.0,
            "EventId": "WCC-14278-PLC02",
        },
        {
            "MessageNumber": 1236,
            "DateTime": "26.02.2026 14:15:00",
            "AlarmText": "Cooling water flow below minimum",
            "Class": "Warning",
            "Priority": 8,
            "Unit": "CW_LOOP",
            "Tag": "CW_FLOW",
            "State": "COME",
            "ProcessValue": 45.2,
            "Limit": 50.0,
            "EventId": "WCC-14150-CW01",
        },
    ],
    "plant_scada": [
        {
            "AlarmID": "CIT-4521",
            "Time": "2026-02-26T14:30:00",
            "Tag": "PUMP_01_FAULT",
            "Description": "Pump 01 high vibration — maintenance required",
            "Category": "Warning",
            "Priority": 3,
            "Equipment": "PUMP_01",
            "Area": "ZONE_A",
            "State": "Active",
            "Value": 12.5,
            "High": 10.0,
            "Acknowledged": False,
        },
        {
            "AlarmID": "CIT-4522",
            "Time": "2026-02-26T14:22:00",
            "Tag": "REACTOR_PRESS_HH",
            "Description": "Reactor R02 pressure high-high alarm",
            "Category": "Critical",
            "Priority": 1,
            "Equipment": "REACTOR_02",
            "Area": "REACTOR_BAY",
            "State": "Active",
            "Value": 18.7,
            "High": 15.0,
            "Acknowledged": False,
        },
        {
            "AlarmID": "CIT-4523",
            "Time": "2026-02-26T14:05:00",
            "Tag": "TANK_LEVEL_LL",
            "Description": "Feed tank T03 level low-low",
            "Category": "Urgent",
            "Priority": 2,
            "Equipment": "TANK_03",
            "Area": "FEED_AREA",
            "State": "Active",
            "Value": 3.2,
            "High": 5.0,
            "Acknowledged": False,
        },
    ],
}

# ---------------------------------------------------------------------------
# Default field mappings per vendor
# ---------------------------------------------------------------------------

DEFAULT_MAPPINGS: dict[str, dict[str, str]] = {
    "ignition": {
        "timestamp_field": "eventtime",
        "message_field": "displaypath",
        "severity_field": "priority",
        "area_field": "displaypath",
        "equipment_field": "source",
        "alarm_type_field": "name",
        "state_field": "eventtype_label",
        "value_field": "eventValue",
        "priority_field": "priority",
        "vendor_id_field": "eventid",
    },
    "factorytalk": {
        "timestamp_field": "TimeStamp",
        "message_field": "Description",
        "severity_field": "Severity",
        "area_field": "Area",
        "equipment_field": "TagName",
        "alarm_type_field": "AlarmName",
        "state_field": "State",
        "value_field": "Value",
        "threshold_field": "Limit",
        "priority_field": "Priority",
        "vendor_id_field": "AlarmId",
    },
    "wincc": {
        "timestamp_field": "DateTime",
        "message_field": "AlarmText",
        "severity_field": "Class",
        "area_field": "Unit",
        "equipment_field": "Tag",
        "alarm_type_field": "Class",
        "state_field": "State",
        "value_field": "ProcessValue",
        "threshold_field": "Limit",
        "priority_field": "Priority",
        "vendor_id_field": "EventId",
    },
    "plant_scada": {
        "timestamp_field": "Time",
        "message_field": "Description",
        "severity_field": "Category",
        "area_field": "Area",
        "equipment_field": "Equipment",
        "alarm_type_field": "Tag",
        "state_field": "State",
        "value_field": "Value",
        "threshold_field": "High",
        "priority_field": "Priority",
        "vendor_id_field": "AlarmID",
    },
}

# ---------------------------------------------------------------------------
# Transform logic
# ---------------------------------------------------------------------------

def _apply_mapping(
    raw_records: list[dict[str, Any]],
    mapping: dict[str, str],
) -> list[dict[str, Any]]:
    """Apply a field mapping config to raw vendor records → canonical form."""

    def get(raw: dict, key: str, default: Any = None) -> Any:
        field_name = mapping.get(key)
        if not field_name:
            return default
        return raw.get(field_name, default)

    result = []
    for raw in raw_records:
        severity = str(get(raw, "severity_field", "info")).lower()
        result.append(
            {
                "timestamp": str(get(raw, "timestamp_field", "")),
                "message": str(get(raw, "message_field", "")),
                "labels": {
                    "severity": severity,
                    "area": str(get(raw, "area_field", "unknown")),
                    "equipment": str(get(raw, "equipment_field", "unknown")),
                    "alarm_type": str(get(raw, "alarm_type_field", "generic")),
                    "isa_priority": _severity_to_isa(severity),
                    "source": "configured",
                    "connector_id": "configured",
                },
                "metadata": {
                    "state": str(get(raw, "state_field", "ACTIVE")),
                    "value": get(raw, "value_field"),
                    "threshold": get(raw, "threshold_field"),
                    "priority": get(raw, "priority_field"),
                    "vendor_alarm_id": str(get(raw, "vendor_id_field", "")),
                    "ack_required": True,
                    "shelved": False,
                },
            }
        )
    return result


def _severity_to_isa(severity: str) -> str:
    sev = severity.lower()
    if sev in ("critical", "high", "fault", "error", "4", "3"):
        return "high"
    if sev in ("warning", "medium", "urgent", "2"):
        return "medium"
    return "low"


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


class MappingBody(BaseModel):
    mapping: dict[str, str]
    export_enabled: bool | None = None


async def _get_connector(connector_id: str, db: AsyncSession) -> Connector:
    result = await db.execute(select(Connector).where(Connector.id == connector_id))
    connector = result.scalar_one_or_none()
    if not connector:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found")
    return connector


async def _fetch_journal_events(db: AsyncSession, limit: int = 50) -> list[dict[str, Any]] | None:
    """Fetch recent alarm events from the journal staging tables in our Postgres."""
    try:
        from app.api.connectors import _fetch_journal_events as fetch
        events = await fetch(db, limit=limit)
        return events if events else None
    except Exception:
        return None


@router.get("/{connector_id}/transform")
async def get_transform_config(
    connector_id: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Return sample data, current field mapping, and a transformed preview."""
    connector = await _get_connector(connector_id, db)

    # Try to fetch live journal data for Ignition connectors
    sample_raw = None
    if connector.connector_type == "ignition":
        sample_raw = await _fetch_journal_events(db)

    # Fall back to static sample data
    if not sample_raw:
        sample_raw = SAMPLE_DATA.get(connector.connector_type, SAMPLE_DATA["ignition"])

    # Use saved mapping if present, otherwise use vendor defaults
    saved = dict(connector.label_mappings or {})
    export_enabled = saved.pop("_export_enabled", False)
    mapping = {**DEFAULT_MAPPINGS.get(connector.connector_type, {}), **saved}

    return {
        "connector_type": connector.connector_type,
        "connector_name": connector.name,
        "sample_raw": sample_raw,
        "mapping": mapping,
        "preview": _apply_mapping(sample_raw, mapping),
        "available_fields": list(sample_raw[0].keys()) if sample_raw else [],
        "export_enabled": bool(export_enabled),
    }


@router.patch("/{connector_id}/transform")
async def save_transform_mapping(
    connector_id: str,
    body: MappingBody,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Persist the field mapping configuration for a connector."""
    connector = await _get_connector(connector_id, db)
    label_mappings = dict(body.mapping)
    if body.export_enabled is not None:
        label_mappings["_export_enabled"] = body.export_enabled
    else:
        # Preserve existing export_enabled state
        existing = connector.label_mappings or {}
        if "_export_enabled" in existing:
            label_mappings["_export_enabled"] = existing["_export_enabled"]
    connector.label_mappings = label_mappings
    await db.commit()
    return {
        "message": "Field mapping saved",
        "connector_id": connector_id,
        "export_enabled": label_mappings.get("_export_enabled", False),
    }


class ExportToggleBody(BaseModel):
    enabled: bool


@router.patch("/{connector_id}/transform/export")
async def toggle_export(
    connector_id: str,
    body: ExportToggleBody,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Enable or disable Loki export for this connector's transform."""
    connector = await _get_connector(connector_id, db)
    label_mappings = dict(connector.label_mappings or {})
    label_mappings["_export_enabled"] = body.enabled
    connector.label_mappings = label_mappings
    await db.commit()
    return {"export_enabled": body.enabled, "connector_id": connector_id}
