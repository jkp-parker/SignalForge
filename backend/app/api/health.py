from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.loki import loki_client

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    db_ok = False
    loki_ok = False

    try:
        await db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass

    try:
        loki_ok = await loki_client.ready()
    except Exception:
        pass

    healthy = db_ok and loki_ok
    return {
        "status": "healthy" if healthy else "degraded",
        "database": "connected" if db_ok else "error",
        "loki": "connected" if loki_ok else "error",
    }
