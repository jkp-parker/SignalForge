from fastapi import APIRouter, Depends, Query

from app.core.security import get_current_user
from app.core.loki import loki_client
from app.models.user import User

router = APIRouter(prefix="/alarms", tags=["alarms"])


@router.get("")
async def query_alarms(
    query: str = Query(default='{job="signalforge"}', description="LogQL query"),
    limit: int = Query(default=100, ge=1, le=5000),
    start: str | None = Query(default=None, description="Start time (RFC3339 or Unix timestamp)"),
    end: str | None = Query(default=None, description="End time (RFC3339 or Unix timestamp)"),
    _user: User = Depends(get_current_user),
):
    result = await loki_client.query(query=query, limit=limit, start=start, end=end)
    return result


@router.get("/labels")
async def get_alarm_labels(
    _user: User = Depends(get_current_user),
):
    result = await loki_client.query_instant(query='{job="signalforge"}', limit=1)
    return result
