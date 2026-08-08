"""Create the complete central application schema.

Revision ID: 20260730_0001
Revises:
Create Date: 2026-07-30
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260730_0001"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


SERVICE_ROWS = [
    {
        "id": "0fb36f4f-2c22-4ff3-a480-cf89cb971f02",
        "name": "React",
        "framework": "React",
        "category": "frontend",
        "default_start_command": "npm run dev -- --host 0.0.0.0",
        "default_port": 5173,
        "scaffold_command": "npm create vite@latest {name} -- --template react --no-interactive --no-immediate --eslint --tailwind --src-dir",
        "start_flags": "--host 0.0.0.0",
        "default_packages": "[]",
    },
    {
        "id": "2889f304-1853-4785-8f01-dfea8f87b294",
        "name": "Next.js",
        "framework": "Next.js",
        "category": "frontend",
        "default_start_command": "npm run dev -- --hostname 0.0.0.0",
        "default_port": 3000,
        "scaffold_command": "npm create-next-app {name} --typescript --tailwind --eslint --app --src-dir --use-npm --yes",
        "start_flags": "--hostname 0.0.0.0",
        "default_packages": "[]",
    },
    {
        "id": "4f5ad64d-dc9a-4221-b706-8bb0fb43899a",
        "name": "Vue",
        "framework": "Vue",
        "category": "frontend",
        "default_start_command": "npm run dev -- --host 0.0.0.0",
        "default_port": 5173,
        "scaffold_command": "npm create vite@latest {name} --template vue",
        "start_flags": "--host 0.0.0.0",
        "default_packages": "[]",
    },
    {
        "id": "6f60bf72-50d6-4f82-adfe-d6becae6a795",
        "name": "Vanilla",
        "framework": "Vanilla",
        "category": "frontend",
        "default_start_command": "npm run dev -- --host 0.0.0.0",
        "default_port": 5173,
        "scaffold_command": "npm create vite@latest {name} --template vanilla",
        "start_flags": "--host 0.0.0.0",
        "default_packages": "[]",
    },
    {
        "id": "8bedbf79-c96b-4ee5-a7dd-a146741a02a5",
        "name": "FastAPI",
        "framework": "FastAPI",
        "category": "backend",
        "default_start_command": "uvicorn main:app --host 0.0.0.0 --port 8000",
        "default_port": 8000,
        "scaffold_command": None,
        "start_flags": "--host 0.0.0.0 --port 8000",
        "default_packages": "[]",
    },
    {
        "id": "aa2a2253-7df5-45fd-b2d2-3dad7345a839",
        "name": "Node.js",
        "framework": "Node.js",
        "category": "backend",
        "default_start_command": "npm start",
        "default_port": 8000,
        "scaffold_command": "express --no-view --force /app/workspace/backend && cd /app/workspace/backend && npm install",
        "start_flags": None,
        "default_packages": "[]",
    },
    {
        "id": "b96d5496-b792-4db4-b1a2-44b366b136ef",
        "name": "Express",
        "framework": "Express",
        "category": "backend",
        "default_start_command": "npm start",
        "default_port": 8000,
        "scaffold_command": None,
        "start_flags": None,
        "default_packages": "[]",
    },
    {
        "id": "c9401a77-bbc3-4cf3-b9cb-ab186a9a8934",
        "name": "Flask",
        "framework": "Flask",
        "category": "backend",
        "default_start_command": "flask run --host=0.0.0.0 --port=8000",
        "default_port": 8000,
        "scaffold_command": None,
        "start_flags": "--host=0.0.0.0 --port=8000",
        "default_packages": "[]",
    },
    {
        "id": "db51e29a-b593-4d9b-8780-a6792169971f",
        "name": "Actix Web",
        "framework": "Actix",
        "category": "backend",
        "default_start_command": "cargo run",
        "default_port": 8000,
        "scaffold_command": None,
        "start_flags": None,
        "default_packages": "[]",
    },
    {
        "id": "eb8d9a36-a4b4-45d1-802f-bd6965c36502",
        "name": "PostgreSQL",
        "framework": "PostgreSQL",
        "category": "database",
        "default_start_command": 'su - postgres -c "pg_ctl -D /var/lib/postgresql/data start -w"',
        "default_port": 5432,
        "scaffold_command": None,
        "start_flags": None,
        "default_packages": "[]",
    },
]


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("username", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=True),
        sa.Column("password", sa.Text(), nullable=True),
        sa.Column("verified", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("verification_token", sa.Text(), nullable=True),
        sa.Column("github_id", sa.Text(), nullable=True),
        sa.Column("github_username", sa.String(length=255), nullable=True),
        sa.Column("github_access_token", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.UniqueConstraint("username", name="uq_users_username"),
        sa.UniqueConstraint("email", name="uq_users_email"),
        sa.UniqueConstraint("verification_token", name="uq_users_verification_token"),
        sa.UniqueConstraint("github_id", name="uq_users_github_id"),
    )

    op.create_table(
        "services",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("framework", sa.String(length=100), nullable=False),
        sa.Column("category", sa.String(length=20), nullable=False),
        sa.Column("default_start_command", sa.Text(), nullable=True),
        sa.Column("default_port", sa.Integer(), nullable=True),
        sa.Column("scaffold_command", sa.Text(), nullable=True),
        sa.Column("start_flags", sa.Text(), nullable=True),
        sa.Column("default_packages", sa.Text(), nullable=False, server_default="[]"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.CheckConstraint(
            "category IN ('frontend', 'backend', 'database')",
            name="ck_services_category",
        ),
        sa.CheckConstraint(
            "default_port IS NULL OR (default_port > 0 AND default_port <= 65535)",
            name="ck_services_default_port",
        ),
        sa.UniqueConstraint("framework", name="uq_services_framework"),
    )

    op.create_table(
        "projects",
        sa.Column("project_id", sa.String(length=36), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(length=36),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="created"),
        sa.Column("access_token", sa.String(length=64), nullable=False),
        sa.Column("container_id", sa.Text(), nullable=True),
        sa.Column("frontend_root", sa.Text(), nullable=True),
        sa.Column("backend_root", sa.Text(), nullable=True),
        sa.Column("db_root", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column("last_online", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('created', 'running', 'stopped')",
            name="ck_projects_status",
        ),
        sa.UniqueConstraint("access_token", name="uq_projects_access_token"),
    )
    op.create_index("ix_projects_user_id", "projects", ["user_id"])
    op.create_index("ix_projects_status_last_online", "projects", ["status", "last_online"])

    op.create_table(
        "project_metadata",
        sa.Column(
            "project_id",
            sa.String(length=36),
            sa.ForeignKey("projects.project_id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "envs",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "db_schema",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column(
            "pages",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "endpoints",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "groups",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )

    op.create_table(
        "project_services",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "project_id",
            sa.String(length=36),
            sa.ForeignKey("projects.project_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "service_id",
            sa.String(length=36),
            sa.ForeignKey("services.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("custom_start_command", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.UniqueConstraint("project_id", "service_id", name="uq_project_services_pair"),
    )
    op.create_index("ix_project_services_project_id", "project_services", ["project_id"])

    op.create_table(
        "products",
        sa.Column("product_id", sa.String(length=36), primary_key=True),
        sa.Column("product_name", sa.String(length=255), nullable=False),
        sa.Column("price", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("stripe_price_id", sa.String(length=255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.CheckConstraint("price >= 0", name="ck_products_price_nonnegative"),
        sa.UniqueConstraint("stripe_price_id", name="uq_products_stripe_price_id"),
    )

    services = sa.table(
        "services",
        sa.column("id", sa.String()),
        sa.column("name", sa.String()),
        sa.column("framework", sa.String()),
        sa.column("category", sa.String()),
        sa.column("default_start_command", sa.Text()),
        sa.column("default_port", sa.Integer()),
        sa.column("scaffold_command", sa.Text()),
        sa.column("start_flags", sa.Text()),
        sa.column("default_packages", sa.Text()),
    )
    op.bulk_insert(services, SERVICE_ROWS)


def downgrade() -> None:
    op.drop_table("products")
    op.drop_index("ix_project_services_project_id", table_name="project_services")
    op.drop_table("project_services")
    op.drop_table("project_metadata")
    op.drop_index("ix_projects_status_last_online", table_name="projects")
    op.drop_index("ix_projects_user_id", table_name="projects")
    op.drop_table("projects")
    op.drop_table("services")
    op.drop_table("users")
