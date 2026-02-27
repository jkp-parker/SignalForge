import logging
from typing import Any

from sqlalchemy import text

from connectors.base import BaseConnector
from db import async_session

logger = logging.getLogger("signal-service.connectors.ignition")

EVENT_TYPE_LABELS = {0: "Active", 1: "Clear", 2: "Ack"}


class IgnitionConnector(BaseConnector):
    """Connector for Ignition alarm journal data via PostgreSQL.

    Ignition writes alarm events directly to our Postgres database
    (alarm_events + alarm_event_data tables). This connector reads
    those events, and the ingestion loop handles cleanup after Loki push.
    """

    def __init__(self, config: dict[str, Any]):
        super().__init__(config)
        self._fetched_ids: list[int] = []

    async def connect(self) -> bool:
        """Verify the alarm journal tables exist in our Postgres."""
        try:
            async with async_session() as session:
                await session.execute(text("SELECT 1 FROM alarm_events LIMIT 0"))
                await session.execute(text("SELECT 1 FROM alarm_event_data LIMIT 0"))
            logger.info("Alarm journal tables verified in Postgres")
            return True
        except Exception as exc:
            logger.error(f"Alarm journal tables not accessible: {exc}")
            return False

    async def disconnect(self) -> None:
        logger.debug("Ignition connector disconnect (no-op)")

    async def fetch_alarms(self, since: str | None = None) -> list[dict[str, Any]]:
        """Fetch unprocessed alarm events from the journal tables.

        Reads alarm_events + alarm_event_data, pivots properties into
        flat dicts. The returned event IDs are stored so the ingestion
        loop can delete them after successful Loki push.
        """
        try:
            async with async_session() as session:
                # Fetch events ordered by time
                query = (
                    "SELECT id, eventid, source, displaypath, priority, "
                    "eventtime, eventtype, eventflags "
                    "FROM alarm_events ORDER BY eventtime ASC LIMIT 1000"
                )
                events_result = await session.execute(text(query))
                events = [dict(row._mapping) for row in events_result]

                if not events:
                    return []

                event_ids = [e["id"] for e in events]
                self._fetched_ids = event_ids

                # Fetch associated properties
                data_result = await session.execute(
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
                    event["eventtype_label"] = EVENT_TYPE_LABELS.get(
                        event["eventtype"], str(event["eventtype"])
                    )

                logger.info(f"Fetched {len(events)} alarm journal event(s)")
                return events

        except Exception as exc:
            logger.error(f"Error fetching alarm journal events: {exc}")
            return []

    def get_fetched_ids(self) -> list[int]:
        """Return the IDs of events fetched in the last fetch_alarms call."""
        return self._fetched_ids

    async def cleanup_processed(self, event_ids: list[int]) -> int:
        """Delete processed events from the journal staging tables."""
        if not event_ids:
            return 0
        try:
            async with async_session() as session:
                # Delete event data first (FK constraint)
                await session.execute(
                    text("DELETE FROM alarm_event_data WHERE id = ANY(:ids)"),
                    {"ids": event_ids},
                )
                result = await session.execute(
                    text("DELETE FROM alarm_events WHERE id = ANY(:ids)"),
                    {"ids": event_ids},
                )
                await session.commit()
                deleted = result.rowcount
                logger.info(f"Cleaned up {deleted} processed event(s) from journal tables")
                return deleted
        except Exception as exc:
            logger.error(f"Error cleaning up journal events: {exc}")
            return 0

    async def health_check(self) -> dict[str, Any]:
        """Check alarm journal table accessibility."""
        try:
            async with async_session() as session:
                result = await session.execute(text("SELECT COUNT(*) FROM alarm_events"))
                count = result.scalar() or 0
                return {
                    "connector_type": "ignition",
                    "status": "healthy",
                    "journal_events": count,
                }
        except Exception as exc:
            return {
                "connector_type": "ignition",
                "status": "unhealthy",
                "error": str(exc),
            }
