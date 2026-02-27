import httpx
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.loki import loki_client

router = APIRouter(tags=["health"])

GRAFANA_URL = "http://grafana:3000"


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    db_ok = False
    loki_ok = False
    grafana_ok = False

    try:
        await db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass

    try:
        loki_ok = await loki_client.ready()
    except Exception:
        pass

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{GRAFANA_URL}/api/health")
            grafana_ok = resp.status_code == 200
    except Exception:
        pass

    # Journal staging table stats
    journal = {"events": 0, "table_size": "0 bytes"}
    if db_ok:
        try:
            count_result = await db.execute(text("SELECT COUNT(*) FROM alarm_events"))
            journal["events"] = count_result.scalar() or 0
            size_result = await db.execute(text(
                "SELECT pg_size_pretty("
                "pg_total_relation_size('alarm_events') + "
                "pg_total_relation_size('alarm_event_data')"
                ") AS total_size"
            ))
            journal["table_size"] = size_result.scalar() or "unknown"
        except Exception:
            pass

    healthy = db_ok and loki_ok
    return {
        "status": "healthy" if healthy else "degraded",
        "database": "connected" if db_ok else "error",
        "loki": "connected" if loki_ok else "error",
        "grafana": "connected" if grafana_ok else "error",
        "journal": journal,
    }
