"""Create alarm journal tables for Ignition alarm event ingestion.

Revision ID: 003
Revises: 002
Create Date: 2026-02-27

These tables match the schema Ignition expects when writing alarm journal data
to an external PostgreSQL database. Ignition inserts rows directly; SignalForge
reads, transforms, pushes to Loki, then cleans up.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "alarm_events",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("eventid", sa.String(255), nullable=True),
        sa.Column("source", sa.Text, nullable=True),
        sa.Column("displaypath", sa.Text, nullable=True),
        sa.Column("priority", sa.Integer, nullable=True),
        sa.Column("eventtime", sa.DateTime(timezone=True), nullable=True),
        sa.Column("eventtype", sa.Integer, nullable=True),
        sa.Column("eventflags", sa.Integer, server_default=sa.text("0")),
    )
    op.create_index("idx_alarm_events_eventtime", "alarm_events", ["eventtime"])
    op.create_index("idx_alarm_events_source", "alarm_events", ["source"])

    op.create_table(
        "alarm_event_data",
        sa.Column("id", sa.Integer, sa.ForeignKey("alarm_events.id", ondelete="CASCADE"), nullable=False),
        sa.Column("propname", sa.String(255), nullable=True),
        sa.Column("dtype", sa.Integer, nullable=True),
        sa.Column("intvalue", sa.Integer, nullable=True),
        sa.Column("floatvalue", sa.Float, nullable=True),
        sa.Column("strvalue", sa.Text, nullable=True),
    )
    op.create_index("idx_alarm_event_data_id", "alarm_event_data", ["id"])


def downgrade() -> None:
    op.drop_table("alarm_event_data")
    op.drop_table("alarm_events")
