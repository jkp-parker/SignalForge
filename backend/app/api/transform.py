"""
Alarm transformation configuration API.

Provides per-connector field mapping between vendor-specific raw alarm data
and the canonical SignalForge alarm schema before ingestion into Loki.
"""
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.connector import Connector
from app.models.user import User

router = APIRouter(prefix="/connectors", tags=["transform"])

# ---------------------------------------------------------------------------
# Vendor sample data
# Field names match what each SCADA system actually produces in its API
# ---------------------------------------------------------------------------

SAMPLE_DATA: dict[str, list[dict[str, Any]]] = {
    "ignition": [
        {
            "id": "ALM-2024-00451",
            "eventTime": "2026-02-26T14:30:00.000Z",
            "name": "HighTemperature",
            "label": "Boiler 01 temperature exceeded 450°F threshold",
            "severity": "high",
            "priority": 1,
            "source": "Boiler01/TempAlarm",
            "area": "Boiler Room",
            "displayPath": "Plant A/Boiler Room",
            "eventState": "Active",
            "currentValue": 462.5,
            "setpointValue": 450.0,
            "ackRequired": True,
            "shelved": False,
        },
        {
            "id": "ALM-2024-00452",
            "eventTime": "2026-02-26T14:28:15.000Z",
            "name": "LowPressure",
            "label": "Pump 02 suction pressure below minimum",
            "severity": "medium",
            "priority": 2,
            "source": "Pump02/PressureAlarm",
            "area": "Pump Room",
            "displayPath": "Plant A/Pump Room",
            "eventState": "Active",
            "currentValue": 12.3,
            "setpointValue": 15.0,
            "ackRequired": True,
            "shelved": False,
        },
        {
            "id": "ALM-2024-00453",
            "eventTime": "2026-02-26T14:15:00.000Z",
            "name": "MotorFault",
            "label": "Conveyor motor drive fault detected",
            "severity": "critical",
            "priority": 0,
            "source": "Conveyor01/DriveAlarm",
            "area": "Production Floor",
            "displayPath": "Plant A/Production Floor",
            "eventState": "Active",
            "currentValue": 1.0,
            "setpointValue": 0.0,
            "ackRequired": True,
            "shelved": False,
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
        "timestamp_field": "eventTime",
        "message_field": "label",
        "severity_field": "severity",
        "area_field": "area",
        "equipment_field": "source",
        "alarm_type_field": "name",
        "state_field": "eventState",
        "value_field": "currentValue",
        "threshold_field": "setpointValue",
        "priority_field": "priority",
        "vendor_id_field": "id",
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
    if sev in ("critical", "high", "fault", "error"):
        return "high"
    if sev in ("warning", "medium", "urgent"):
        return "medium"
    return "low"


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


class MappingBody(BaseModel):
    mapping: dict[str, str]


async def _get_connector(connector_id: str, db: AsyncSession) -> Connector:
    result = await db.execute(select(Connector).where(Connector.id == connector_id))
    connector = result.scalar_one_or_none()
    if not connector:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found")
    return connector


@router.get("/{connector_id}/transform")
async def get_transform_config(
    connector_id: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Return vendor sample data, current field mapping, and a transformed preview."""
    connector = await _get_connector(connector_id, db)
    sample_raw = SAMPLE_DATA.get(connector.connector_type, SAMPLE_DATA["ignition"])

    # Use saved mapping if present, otherwise use vendor defaults
    saved = connector.label_mappings or {}
    mapping = {**DEFAULT_MAPPINGS.get(connector.connector_type, {}), **saved}

    return {
        "connector_type": connector.connector_type,
        "connector_name": connector.name,
        "sample_raw": sample_raw,
        "mapping": mapping,
        "preview": _apply_mapping(sample_raw, mapping),
        "available_fields": list(sample_raw[0].keys()) if sample_raw else [],
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
    connector.label_mappings = body.mapping
    await db.commit()
    return {"message": "Field mapping saved", "connector_id": connector_id}
