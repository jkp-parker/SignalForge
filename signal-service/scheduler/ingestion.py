"""Alarm ingestion cycle — polls enabled connectors for new alarms.

Data flow:
  1. Query DB for enabled connectors
  2. For each connector, instantiate the appropriate connector class
  3. Fetch alarm events from our Postgres journal tables
  4. Normalize raw alarms via the transform pipeline
  5. Push normalized alarms to Loki (only if export is enabled)
  6. Clean up processed events from journal tables
  7. Update connector status in DB
"""

import asyncio
import json
import logging
from datetime import datetime, timezone

import httpx
from sqlalchemy import select

from config import settings
from db import async_session
from models import Connector
from connectors.ignition import IgnitionConnector
from normalizer.transform import normalize_ignition_alarm

logger = logging.getLogger("signal-service.ingestion")

# Map connector types to their implementation classes
CONNECTOR_CLASSES = {
    "ignition": IgnitionConnector,
}


async def _push_to_loki(labels: dict, message: str, metadata: dict, timestamp_ns: int) -> bool:
    """Push a single alarm event to Loki."""
    line = json.dumps({"message": message, **metadata})
    payload = {
        "streams": [
            {
                "stream": labels,
                "values": [[str(timestamp_ns), line]],
            }
        ]
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{settings.LOKI_URL.rstrip('/')}/loki/api/v1/push",
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            return resp.status_code == 204
    except Exception as exc:
        logger.warning(f"Loki push failed: {exc}")
        return False


async def _run_ingestion():
    """Async ingestion cycle implementation."""
    async with async_session() as session:
        result = await session.execute(
            select(Connector).where(Connector.enabled == True)
        )
        connectors = result.scalars().all()

        if not connectors:
            logger.debug("No enabled connectors found")
            return

        for conn in connectors:
            connector_cls = CONNECTOR_CLASSES.get(conn.connector_type)
            if not connector_cls:
                logger.debug(f"Skipping '{conn.name}' — no implementation for type '{conn.connector_type}'")
                continue

            logger.info(f"Polling connector '{conn.name}' ({conn.connector_type})")

            try:
                config = {
                    "host": conn.host,
                    "port": conn.port,
                    "credentials": conn.credentials or {},
                    "connection_params": conn.connection_params or {},
                }
                connector = connector_cls(config)

                # Verify journal tables
                connected = await connector.connect()
                if not connected:
                    conn.status = "error"
                    conn.error_message = "Alarm journal tables not accessible"
                    await session.commit()
                    continue

                conn.status = "polling"
                await session.commit()

                # Fetch raw alarm events from journal tables
                raw_alarms = await connector.fetch_alarms()
                logger.info(f"Connector '{conn.name}': fetched {len(raw_alarms)} journal event(s)")

                # Check if export is enabled
                label_mappings = conn.label_mappings or {}
                export_enabled = label_mappings.get("_export_enabled", False)

                if raw_alarms and export_enabled:
                    # Normalize and push to Loki
                    pushed = 0
                    pushed_ids: list[int] = []
                    for raw in raw_alarms:
                        try:
                            event = normalize_ignition_alarm(raw, conn.id, conn.name)
                            payload = event.to_loki_payload()
                            ok = await _push_to_loki(
                                labels=payload["labels"],
                                message=payload["message"],
                                metadata=payload["metadata"],
                                timestamp_ns=payload["timestamp_ns"],
                            )
                            if ok:
                                pushed += 1
                                pushed_ids.append(raw["id"])
                        except Exception as exc:
                            logger.warning(f"Failed to normalize/push alarm: {exc}")

                    logger.info(f"Connector '{conn.name}': pushed {pushed}/{len(raw_alarms)} event(s) to Loki")

                    # Clean up successfully processed events
                    if pushed_ids:
                        deleted = await connector.cleanup_processed(pushed_ids)
                        logger.info(f"Connector '{conn.name}': cleaned up {deleted} processed event(s)")

                elif raw_alarms and not export_enabled:
                    logger.info(
                        f"Connector '{conn.name}': {len(raw_alarms)} event(s) fetched but "
                        f"export not enabled — skipping Loki push. "
                        f"Enable export on the Transform page."
                    )

                # Update status
                conn.status = "connected"
                conn.last_successful_pull = datetime.now(timezone.utc)
                conn.error_message = None
                await session.commit()

                await connector.disconnect()

            except Exception as exc:
                logger.error(f"Error polling connector '{conn.name}': {exc}")
                conn.status = "error"
                conn.error_message = str(exc)[:500]
                await session.commit()


_loop = asyncio.new_event_loop()


def run_ingestion_cycle():
    """Main ingestion cycle entry point — called by APScheduler."""
    logger.info("Running ingestion cycle...")
    try:
        _loop.run_until_complete(_run_ingestion())
    except Exception as exc:
        logger.error(f"Ingestion cycle failed: {exc}")
    logger.info("Ingestion cycle complete")
