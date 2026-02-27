import asyncio
import time
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, text, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, get_current_admin
from app.models.connector import Connector
from app.models.user import User
from app.schemas.connector import ConnectorCreate, ConnectorUpdate, ConnectorResponse, ConnectorTestResult

router = APIRouter(prefix="/connectors", tags=["connectors"])

VALID_CONNECTOR_TYPES = {"ignition", "factorytalk", "wincc", "plant_scada"}

EVENT_TYPE_LABELS = {0: "Active", 1: "Clear", 2: "Ack"}


@router.get("", response_model=list[ConnectorResponse])
async def list_connectors(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(select(Connector).order_by(Connector.created_at.desc()))
    return result.scalars().all()


@router.post("", response_model=ConnectorResponse, status_code=status.HTTP_201_CREATED)
async def create_connector(
    connector_in: ConnectorCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    if connector_in.connector_type not in VALID_CONNECTOR_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid connector type. Must be one of: {', '.join(sorted(VALID_CONNECTOR_TYPES))}",
        )

    connector = Connector(**connector_in.model_dump())
    db.add(connector)
    await db.flush()
    await db.refresh(connector)
    return connector


@router.get("/{connector_id}", response_model=ConnectorResponse)
async def get_connector(
    connector_id: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(select(Connector).where(Connector.id == connector_id))
    connector = result.scalar_one_or_none()
    if not connector:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found")
    return connector


@router.patch("/{connector_id}", response_model=ConnectorResponse)
async def update_connector(
    connector_id: str,
    connector_in: ConnectorUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(select(Connector).where(Connector.id == connector_id))
    connector = result.scalar_one_or_none()
    if not connector:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found")

    update_data = connector_in.model_dump(exclude_unset=True)
    if "connector_type" in update_data and update_data["connector_type"] not in VALID_CONNECTOR_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid connector type. Must be one of: {', '.join(sorted(VALID_CONNECTOR_TYPES))}",
        )

    for field, value in update_data.items():
        setattr(connector, field, value)

    await db.flush()
    await db.refresh(connector)
    return connector


@router.delete("/{connector_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_connector(
    connector_id: str,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(select(Connector).where(Connector.id == connector_id))
    connector = result.scalar_one_or_none()
    if not connector:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found")
    await db.delete(connector)


# ---------------------------------------------------------------------------
# Alarm journal helpers
# ---------------------------------------------------------------------------

async def _fetch_journal_events(
    db: AsyncSession,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """Fetch recent alarm events from the journal staging tables."""
    events_result = await db.execute(
        text(
            "SELECT id, eventid, source, displaypath, priority, eventtime, eventtype, eventflags "
            "FROM alarm_events ORDER BY eventtime DESC LIMIT :lim"
        ),
        {"lim": limit},
    )
    events = [dict(row._mapping) for row in events_result]
    if not events:
        return []

    # Fetch associated properties
    event_ids = [e["id"] for e in events]
    data_result = await db.execute(
        text(
            "SELECT id, propname, dtype, intvalue, floatvalue, strvalue "
            "FROM alarm_event_data WHERE id = ANY(:ids)"
        ),
        {"ids": event_ids},
    )

    # Group properties by event id
    props: dict[int, dict[str, Any]] = {}
    for row in data_result:
        r = dict(row._mapping)
        eid = r["id"]
        if eid not in props:
            props[eid] = {}
        # Pick the right value based on dtype
        if r["dtype"] == 0:
            props[eid][r["propname"]] = r["intvalue"]
        elif r["dtype"] == 1:
            props[eid][r["propname"]] = r["floatvalue"]
        else:
            props[eid][r["propname"]] = r["strvalue"]

    # Merge properties into events
    for event in events:
        event_props = props.get(event["id"], {})
        event["name"] = event_props.get("name", "")
        event["ackUser"] = event_props.get("ackUser", "")
        event["eventValue"] = event_props.get("eventValue", "")
        event["isInitialEvent"] = event_props.get("isInitialEvent", "")
        event["eventtype_label"] = EVENT_TYPE_LABELS.get(event["eventtype"], str(event["eventtype"]))

    return events


async def _get_journal_stats(db: AsyncSession) -> dict[str, Any]:
    """Get summary stats for the alarm journal staging tables."""
    count_result = await db.execute(text("SELECT COUNT(*) as cnt FROM alarm_events"))
    total = count_result.scalar() or 0

    if total == 0:
        return {"total": 0, "by_type": {}, "earliest": None, "latest": None}

    # Event type breakdown
    type_result = await db.execute(
        text("SELECT eventtype, COUNT(*) as cnt FROM alarm_events GROUP BY eventtype")
    )
    by_type = {
        EVENT_TYPE_LABELS.get(row.eventtype, str(row.eventtype)): row.cnt
        for row in type_result
    }

    # Time range
    range_result = await db.execute(
        text("SELECT MIN(eventtime) as earliest, MAX(eventtime) as latest FROM alarm_events")
    )
    range_row = range_result.one()

    return {
        "total": total,
        "by_type": by_type,
        "earliest": range_row.earliest.isoformat() if range_row.earliest else None,
        "latest": range_row.latest.isoformat() if range_row.latest else None,
    }


# ---------------------------------------------------------------------------
# Journal status endpoint (used by setup wizard)
# ---------------------------------------------------------------------------

@router.get("/journal/status")
async def journal_status(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Check if alarm journal data is flowing into our Postgres tables."""
    try:
        stats = await _get_journal_stats(db)
        return {
            "has_data": stats["total"] > 0,
            **stats,
        }
    except Exception as exc:
        return {
            "has_data": False,
            "total": 0,
            "error": str(exc),
        }


# ---------------------------------------------------------------------------
# Test endpoint
# ---------------------------------------------------------------------------

@router.post("/{connector_id}/test", response_model=ConnectorTestResult)
async def test_connector(
    connector_id: str,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    result = await db.execute(select(Connector).where(Connector.id == connector_id))
    connector = result.scalar_one_or_none()
    if not connector:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found")

    # Query alarm journal tables in our Postgres
    start = time.monotonic()
    try:
        stats = await _get_journal_stats(db)
        latency_ms = round((time.monotonic() - start) * 1000, 1)
    except Exception as exc:
        return ConnectorTestResult(
            success=False,
            message=f"Error querying alarm journal tables: {exc}",
            note="Ensure the alarm_events and alarm_event_data tables exist (run migrations).",
        )

    if stats["total"] == 0:
        return ConnectorTestResult(
            success=True,
            message="Alarm journal tables exist but contain no data",
            connection_ms=latency_ms,
            note=(
                "No alarm events found. Configure the Ignition alarm journal "
                "to write to this PostgreSQL database, then trigger some alarms."
            ),
        )

    # Fetch sample events
    sample_events = await _fetch_journal_events(db, limit=50)

    # Normalize with transform logic
    from app.api.transform import DEFAULT_MAPPINGS, _apply_mapping
    saved = dict(connector.label_mappings or {})
    saved.pop("_export_enabled", None)
    mapping = {**DEFAULT_MAPPINGS.get(connector.connector_type, {}), **saved}
    normalized = _apply_mapping(sample_events, mapping) if sample_events else []

    # Build message
    type_parts = [f"{count} {label}" for label, count in stats["by_type"].items()]
    return ConnectorTestResult(
        success=True,
        message=(
            f"Found {stats['total']} alarm event(s) in journal — "
            f"{', '.join(type_parts)}"
        ),
        connection_ms=latency_ms,
        sample_records=sample_events[:50],
        normalized_preview=normalized[:50],
        note=(
            f"Alarm journal data from {stats['earliest']} to {stats['latest']}. "
            f"Events are staged in PostgreSQL before transformation and export to Loki."
        ) if stats["earliest"] and stats["latest"] else None,
    )
