"""Minimal SQLAlchemy models for signal-service — maps to same tables as backend."""

from datetime import datetime

from sqlalchemy import String, Integer, DateTime, JSON, Text, MetaData
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    metadata = MetaData()


class Connector(Base):
    __tablename__ = "connectors"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    connector_type: Mapped[str] = mapped_column(String(50))
    host: Mapped[str] = mapped_column(String(255))
    port: Mapped[int] = mapped_column(Integer)
    credentials: Mapped[dict] = mapped_column(JSON, default=dict)
    connection_params: Mapped[dict] = mapped_column(JSON, default=dict)
    polling_interval: Mapped[int] = mapped_column(Integer, default=30)
    alarm_filters: Mapped[dict] = mapped_column(JSON, default=dict)
    label_mappings: Mapped[dict] = mapped_column(JSON, default=dict)
    enabled: Mapped[bool] = mapped_column(default=True)
    status: Mapped[str] = mapped_column(String(50), default="disconnected")
    last_successful_pull: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
