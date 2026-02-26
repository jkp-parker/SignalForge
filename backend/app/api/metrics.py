import time

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.loki import loki_client
from app.core.security import get_current_user
from app.models.connector import Connector
from app.models.user import User

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/overview")
async def get_overview(
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    now = int(time.time())
    start_24h = now - 86400

    # 1. Hourly alarm counts over past 24h (time series for chart)
    alarm_rate: list[dict] = []
    try:
        result = await loki_client.query_metric(
            query='count_over_time({job="signalforge"}[1h])',
            start=str(start_24h),
            end=str(now),
            step=3600,
        )
        series_list = result.get("data", {}).get("result", [])
        if series_list:
            buckets: dict[int, int] = {}
            for series in series_list:
                for ts_str, val_str in series.get("values", []):
                    ts = int(float(ts_str))
                    buckets[ts] = buckets.get(ts, 0) + int(float(val_str))
            alarm_rate = [{"time": ts, "count": cnt} for ts, cnt in sorted(buckets.items())]
    except Exception:
        pass

    # 2. Severity breakdown over past 24h (instant metric query)
    by_severity: list[dict] = []
    try:
        result = await loki_client.query_instant(
            query='sum by (severity) (count_over_time({job="signalforge"}[24h]))',
        )
        for series in result.get("data", {}).get("result", []):
            by_severity.append({
                "severity": series.get("metric", {}).get("severity", "unknown"),
                "count": int(float(series["value"][1])),
            })
    except Exception:
        pass

    # 3. Last 1h total
    last_1h = 0
    try:
        result = await loki_client.query_instant(
            query='sum(count_over_time({job="signalforge"}[1h]))',
        )
        result_list = result.get("data", {}).get("result", [])
        if result_list:
            last_1h = int(float(result_list[0]["value"][1]))
    except Exception:
        pass

    # 4. Connector stats from DB
    rows = await db.execute(select(Connector))
    connectors = rows.scalars().all()
    connector_stats = {
        "total": len(connectors),
        "connected": sum(1 for c in connectors if c.status in ("connected", "polling")),
        "error": sum(1 for c in connectors if c.status == "error"),
        "disconnected": sum(1 for c in connectors if c.status not in ("connected", "polling", "error")),
        "connectors": [
            {
                "id": c.id,
                "name": c.name,
                "connector_type": c.connector_type,
                "host": c.host,
                "status": c.status,
                "enabled": c.enabled,
                "last_successful_pull": c.last_successful_pull.isoformat() if c.last_successful_pull else None,
                "error_message": c.error_message,
            }
            for c in connectors
        ],
    }

    return {
        "alarm_rate": alarm_rate,
        "by_severity": by_severity,
        "totals": {
            "last_1h": last_1h,
            "last_24h": sum(p["count"] for p in alarm_rate),
        },
        "connectors": connector_stats,
    }
