"""Add users.role

Revision ID: 20260425_00
Revises: 20260423_01
Create Date: 2026-04-25
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "20260425_00"
down_revision = "20260423_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing = {col["name"] for col in inspector.get_columns("users")}
    if "role" in existing:
        return

    op.add_column(
        "users",
        sa.Column(
            "role",
            sa.String(length=50),
            nullable=False,
            server_default=sa.text("'user'"),
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "role")

