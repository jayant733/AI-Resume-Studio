"""Add users.subscription_status

Revision ID: 20260423_01
Revises: 20260423_00
Create Date: 2026-04-23
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "20260423_01"
down_revision = "20260423_00"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing = {col["name"] for col in inspector.get_columns("users")}
    if "subscription_status" in existing:
        return

    # Add column with server default so existing rows get a value safely.
    op.add_column(
        "users",
        sa.Column(
            "subscription_status",
            sa.String(length=50),
            nullable=False,
            server_default=sa.text("'free'"),
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "subscription_status")
