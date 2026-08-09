"""Fix the PostgreSQL scaffold command.

Revision ID: 003_fix_postgresql_scaffold
Revises: 002_adding_missing
Create Date: 2026-08-09
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "003_fix_postgresql_scaffold"
down_revision: Union[str, Sequence[str], None] = "002_adding_missing"
branch_labels = None
depends_on = None

CORRECT_COMMAND = "su - postgres -c \"pg_ctl -D /var/lib/postgresql/data start -w && psql -c 'CREATE DATABASE {name}'\""
BROKEN_COMMAND = "su - postgres -c \"pg_ctl -D /var/lib/postgresql/data start -w && psql -c 'CREATE DATABASE {name}:'\""


def upgrade() -> None:
    op.execute(sa.text("UPDATE services SET scaffold_command = :command WHERE framework = 'PostgreSQL'").bindparams(command=CORRECT_COMMAND))


def downgrade() -> None:
    op.execute(sa.text("UPDATE services SET scaffold_command = :command WHERE framework = 'PostgreSQL'").bindparams(command=BROKEN_COMMAND))
