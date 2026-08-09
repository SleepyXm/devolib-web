"""Create the complete central application schema.

Revision ID: 001
Revises:
Create Date: 2026-07-30
"""

from datetime import datetime
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "001_adding_initial_schema"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


BACKEND_CREATED_AT = datetime(2026, 1, 26, 10, 29, 30, 494318)
FRONTEND_CREATED_AT = datetime(2026, 1, 26, 10, 29, 39, 454619)
DATABASE_CREATED_AT = datetime(2026, 1, 26, 10, 29, 46, 255453)

SERVICE_ROWS = [
    {"id": "b3b466a1-d7bc-4398-abc3-44b3a4ba36b2", "name": "PostgreSQL", "default_start_command": "su - postgres -c 'pg_ctl -D /var/lib/postgresql/data start'", "created_at": DATABASE_CREATED_AT,
     "framework": "PostgreSQL", "default_port": 5432, "packages": ["postgresql", "postgresql-client"], "scaffold_command": 'su - postgres -c "pg_ctl -D /var/lib/postgresql/data start -w && psql -c \'CREATE DATABASE {name}\'"', "start_flags": None, "category": "database", "default_packages": "[]"},
    {"id": "fb28141f-c577-4928-91bf-c177b68c191a", "name": "Next.js App", "default_start_command": "bun run dev", "created_at": FRONTEND_CREATED_AT,
     "framework": "Next.js", "default_port": 3000, "packages": ["nodejs", "npm"], "scaffold_command": 'npx create-next-app {name} --typescript --tailwind --app --eslint --no-git --import-alias "@/*" --no-src-dir --no-react-compiler --turbopack', "start_flags": ["-H", "0.0.0.0", "-p", "3000"], "category": "frontend", "default_packages": "[]"},
    {"id": "abb815a3-0633-4738-8545-f4163124b987", "name": "React App", "default_start_command": "bun run dev -- --host 0.0.0.0", "created_at": FRONTEND_CREATED_AT,
     "framework": "React", "default_port": 5173, "packages": ["nodejs", "npm"], "scaffold_command": "npm create vite@latest {name} -- --template react --no-interactive --no-rolldown && cd {name} && npm install", "start_flags": None, "category": "frontend", "default_packages": '["react-router-dom", "axios", "@tanstack/react-query", "zod", "react-hook-form", "clsx", "date-fns", "@tailwindcss/vite"]'},
    {"id": "68472f3f-3f13-45f8-8d96-bba2e2b0940b", "name": "Django App", "default_start_command": "python manage.py runserver", "created_at": BACKEND_CREATED_AT,
     "framework": "Django", "default_port": 8000, "packages": None, "scaffold_command": None, "start_flags": None, "category": "backend", "default_packages": "[]"},
    {"id": "877400ef-2742-46e4-8d1a-74eaf6f0c2b9", "name": "Flask API", "default_start_command": "flask run", "created_at": BACKEND_CREATED_AT,
     "framework": "Flask", "default_port": 5000, "packages": None, "scaffold_command": None, "start_flags": None, "category": "backend", "default_packages": "[]"},
    {"id": "52b0adef-cc7a-4163-b657-857da3240db5", "name": "Spring Boot", "default_start_command": "./mvnw spring-boot:run", "created_at": BACKEND_CREATED_AT,
     "framework": "Spring Boot", "default_port": None, "packages": None, "scaffold_command": None, "start_flags": None, "category": "backend", "default_packages": "[]"},
    {"id": "a78848d3-04d3-47d7-bb7c-d479577a209e", "name": "FastAPI Service", "default_start_command": "uvicorn main:app --reload --host 0.0.0.0 --port 8000", "created_at": BACKEND_CREATED_AT,
     "framework": "FastAPI", "default_port": 8000, "packages": [], "scaffold_command": None, "start_flags": None, "category": "backend", "default_packages": "[]"},
    {"id": "d170f798-92ea-4fc4-8dc5-3691cb6dcec7", "name": "Node.js API", "default_start_command": "node index.js", "created_at": BACKEND_CREATED_AT,
     "framework": "Node.js", "default_port": None, "packages": ["nodejs", "npm"], "scaffold_command": None, "start_flags": None, "category": "backend", "default_packages": "[]"},
    {"id": "b3db754c-b7dd-4417-8364-d9ab8b962d9e", "name": "Express Server", "default_start_command": "npm start", "created_at": BACKEND_CREATED_AT,
     "framework": "Express", "default_port": 8000, "packages": ["nodejs", "npm"], "scaffold_command": None, "start_flags": None, "category": "backend", "default_packages": "[]"},
    {"id": "25d7d46b-39b5-4249-8ff9-88f9c213673e", "name": "Go API", "default_start_command": "go run main.go", "created_at": BACKEND_CREATED_AT,
     "framework": "Go", "default_port": 8000, "packages": ["go"], "scaffold_command": None, "start_flags": None, "category": "backend", "default_packages": "[]"},
    {"id": "3734b3d8-0ddc-4108-b90b-bb9c69011bc0", "name": "Svelte App", "default_start_command": "npm run dev", "created_at": FRONTEND_CREATED_AT,
     "framework": "Svelte", "default_port": None, "packages": ["nodejs", "npm"], "scaffold_command": None, "start_flags": None, "category": "frontend", "default_packages": "[]"},
    {"id": "9fd66a54-0dba-48f1-b345-ed2f4b0a33d3", "name": "Vue.js App", "default_start_command": "npm run serve", "created_at": FRONTEND_CREATED_AT,
     "framework": "Vue.js", "default_port": 5173, "packages": ["nodejs", "npm"], "scaffold_command": None, "start_flags": ["--host", "0.0.0.0", "--port", "5173"], "category": "frontend", "default_packages": "[]"},
    {"id": "921ebfb9-6daf-423d-bff3-f7c856959aec", "name": "Angular App", "default_start_command": "ng serve", "created_at": FRONTEND_CREATED_AT,
     "framework": "Angular", "default_port": 4200, "packages": ["nodejs", "npm"], "scaffold_command": None, "start_flags": ["--host", "0.0.0.0", "--port", "4200"], "category": "frontend", "default_packages": "[]"},
    {"id": "1a51f42f-d08b-424b-a86d-6a97fc13127b", "name": "MySQL", "default_start_command": "mysql.server start", "created_at": DATABASE_CREATED_AT,
     "framework": "MySQL", "default_port": 3306, "packages": ["mariadb", "mariadb-client"], "scaffold_command": None, "start_flags": None, "category": "database", "default_packages": "[]"},
    {"id": "809c896b-3fdd-4bd6-8891-5ce4183ae277", "name": "MongoDB", "default_start_command": "mongod --config /usr/local/etc/mongod.conf", "created_at": DATABASE_CREATED_AT,
     "framework": "MongoDB", "default_port": None, "packages": ["mongodb"], "scaffold_command": None, "start_flags": None, "category": "database", "default_packages": "[]"},
    {"id": "f88ee995-eab8-4565-890f-745f3cfee70a", "name": "Redis", "default_start_command": "redis-server", "created_at": DATABASE_CREATED_AT,
     "framework": "Redis", "default_port": 6379, "packages": ["redis"], "scaffold_command": None, "start_flags": None, "category": "database", "default_packages": "[]"},
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
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("username", name="uq_users_username"),
        sa.UniqueConstraint("email", name="uq_users_email"),
        sa.UniqueConstraint("verification_token", name="uq_users_verification_token"),
        sa.UniqueConstraint("github_id", name="uq_users_github_id"),
    )

    op.create_table(
        "services",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("default_start_command", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("framework", sa.String(length=100), nullable=False),
        sa.Column("default_port", sa.Integer(), nullable=True),
        sa.Column("packages", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("scaffold_command", sa.Text(), nullable=True),
        sa.Column("start_flags", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("category", sa.String(length=20), nullable=False),
        sa.Column("default_packages", sa.Text(), nullable=False, server_default="[]"),
        sa.CheckConstraint("category IN ('frontend', 'backend', 'database')", name="ck_services_category"),
        sa.CheckConstraint("default_port IS NULL OR (default_port > 0 AND default_port <= 65535)", name="ck_services_default_port"),
        sa.UniqueConstraint("framework", name="uq_services_framework"),
    )

    op.create_table(
        "projects",
        sa.Column("project_id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="created"),
        sa.Column("access_token", sa.String(length=64), nullable=False),
        sa.Column("container_id", sa.Text(), nullable=True),
        sa.Column("frontend_root", sa.Text(), nullable=True),
        sa.Column("backend_root", sa.Text(), nullable=True),
        sa.Column("db_root", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("last_online", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("status IN ('created', 'running', 'stopped')", name="ck_projects_status"),
        sa.UniqueConstraint("access_token", name="uq_projects_access_token"),
    )
    op.create_index("ix_projects_user_id", "projects", ["user_id"])
    op.create_index("ix_projects_status_last_online", "projects", ["status", "last_online"])

    op.create_table(
        "project_metadata",
        sa.Column("project_id", sa.String(length=36), sa.ForeignKey("projects.project_id", ondelete="CASCADE"), primary_key=True),
        sa.Column("envs", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("db_schema", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("pages", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("endpoints", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("groups", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )

    op.create_table(
        "project_services",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("project_id", sa.String(length=36), sa.ForeignKey("projects.project_id", ondelete="CASCADE"), nullable=False),
        sa.Column("service_id", sa.String(length=36), sa.ForeignKey("services.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("custom_start_command", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("project_id", "service_id", name="uq_project_services_pair"),
    )
    op.create_index("ix_project_services_project_id", "project_services", ["project_id"])

    op.create_table(
        "products",
        sa.Column("product_id", sa.String(length=36), primary_key=True),
        sa.Column("product_name", sa.String(length=255), nullable=False),
        sa.Column("price", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("stripe_price_id", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.CheckConstraint("price >= 0", name="ck_products_price_nonnegative"),
        sa.UniqueConstraint("stripe_price_id", name="uq_products_stripe_price_id"),
    )

    services = sa.table(
        "services",
        sa.column("id", sa.String()),
        sa.column("name", sa.String()),
        sa.column("default_start_command", sa.Text()),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("framework", sa.String()),
        sa.column("default_port", sa.Integer()),
        sa.column("packages", postgresql.ARRAY(sa.Text())),
        sa.column("scaffold_command", sa.Text()),
        sa.column("start_flags", postgresql.ARRAY(sa.Text())),
        sa.column("category", sa.String()),
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
