"""Rename users.email to users.username

Revision ID: 002
Revises: 001
Create Date: 2026-02-26

"""
from typing import Sequence, Union

from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("users", "email", new_column_name="username")


def downgrade() -> None:
    op.alter_column("users", "username", new_column_name="email")
