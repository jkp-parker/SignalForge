from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, get_current_admin
from app.models.connector import Connector
from app.models.user import User
from app.schemas.connector import ConnectorCreate, ConnectorUpdate, ConnectorResponse, ConnectorTestResult

router = APIRouter(prefix="/connectors", tags=["connectors"])

VALID_CONNECTOR_TYPES = {"ignition", "factorytalk", "wincc", "plant_scada"}


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


@router.post("/{connector_id}/test", response_model=ConnectorTestResult)
async def test_connector(
    connector_id: str,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
):
    import asyncio
    import time

    result = await db.execute(select(Connector).where(Connector.id == connector_id))
    connector = result.scalar_one_or_none()
    if not connector:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connector not found")

    # 1. TCP connectivity test
    connected = False
    latency_ms: float | None = None
    conn_message: str

    start = time.monotonic()
    try:
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(connector.host, connector.port),
            timeout=5.0,
        )
        writer.close()
        try:
            await writer.wait_closed()
        except Exception:
            pass
        latency_ms = round((time.monotonic() - start) * 1000, 1)
        connected = True
        conn_message = f"TCP handshake successful — {connector.host}:{connector.port} ({latency_ms:.0f}ms)"
    except asyncio.TimeoutError:
        conn_message = f"Connection timed out — {connector.host}:{connector.port} did not respond within 5s"
    except ConnectionRefusedError:
        conn_message = f"Connection refused — no service listening on {connector.host}:{connector.port}"
    except OSError as exc:
        conn_message = f"Network error connecting to {connector.host}:{connector.port}: {exc}"

    # 2. Simulated data poll using vendor sample data + current field mapping
    from app.api.transform import SAMPLE_DATA, DEFAULT_MAPPINGS, _apply_mapping

    sample_data = SAMPLE_DATA.get(connector.connector_type, [])
    mapping = {
        **DEFAULT_MAPPINGS.get(connector.connector_type, {}),
        **(connector.label_mappings or {}),
    }
    normalized = _apply_mapping(sample_data, mapping)

    return ConnectorTestResult(
        success=connected,
        message=conn_message,
        connection_ms=latency_ms,
        sample_records=sample_data[:3],
        normalized_preview=normalized[:3],
        note=(
            "Data poll is simulated using vendor-specific sample records. "
            "Live polling from the SCADA system will be available in Phase 2 "
            "when the connector implementation is complete."
        ),
    )
