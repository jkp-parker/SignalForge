"""Initial schema

Revision ID: 001
Revises:
Create Date: 2026-02-26

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False, server_default=""),
        sa.Column("role", sa.String(50), nullable=False, server_default="operator"),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "connectors",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("connector_type", sa.String(50), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("host", sa.String(255), nullable=False),
        sa.Column("port", sa.Integer(), nullable=False, server_default="8088"),
        sa.Column("credentials", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("connection_params", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("polling_interval", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("alarm_filters", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("label_mappings", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("enabled", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("status", sa.String(50), nullable=False, server_default="disconnected"),
        sa.Column("last_successful_pull", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("connectors")
    op.drop_table("users")
