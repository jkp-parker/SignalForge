import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Integer, DateTime, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Connector(Base):
    __tablename__ = "connectors"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    connector_type: Mapped[str] = mapped_column(String(50), nullable=False)  # ignition, factorytalk, wincc, plant_scada
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    host: Mapped[str] = mapped_column(String(255), nullable=False)
    port: Mapped[int] = mapped_column(Integer, nullable=False, default=8088)
    credentials: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)  # username, password, etc.
    connection_params: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)  # OPC-UA endpoint, etc.
    polling_interval: Mapped[int] = mapped_column(Integer, nullable=False, default=30)  # seconds
    alarm_filters: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)  # filter rules
    label_mappings: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)  # Loki label mappings
    enabled: Mapped[bool] = mapped_column(default=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="disconnected")  # connected, polling, error, disconnected
    last_successful_pull: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
