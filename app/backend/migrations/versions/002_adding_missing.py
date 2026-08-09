"""Add subscription tier to users.

Revision ID: 002_adding_missing
Revises: 001_adding_initial_schema
Create Date: 2026-08-07
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "002_adding_missing"
down_revision: Union[str, Sequence[str], None] = "001_adding_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "subscription_tier",
            sa.String(length=50),
            nullable=False,
            server_default="free",
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "subscription_tier")