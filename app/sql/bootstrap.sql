\set ON_ERROR_STOP on

-- Standalone equivalent of Alembic revision 20260730_0001.
-- Intended for a completely empty PostgreSQL database. Prefer Alembic for
-- normal setup so later migrations remain ordered and repeatable.

BEGIN;

CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(320),
    password TEXT,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_token TEXT,
    github_id TEXT,
    github_username VARCHAR(255),
    github_access_token TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_users_username UNIQUE (username),
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT uq_users_verification_token UNIQUE (verification_token),
    CONSTRAINT uq_users_github_id UNIQUE (github_id)
);

CREATE TABLE services (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    framework VARCHAR(100) NOT NULL,
    category VARCHAR(20) NOT NULL,
    default_start_command TEXT,
    default_port INTEGER,
    scaffold_command TEXT,
    start_flags TEXT,
    default_packages TEXT NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_services_category
        CHECK (category IN ('frontend', 'backend', 'database')),
    CONSTRAINT ck_services_default_port
        CHECK (default_port IS NULL OR (default_port > 0 AND default_port <= 65535)),
    CONSTRAINT uq_services_framework UNIQUE (framework)
);

CREATE TABLE projects (
    project_id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'created',
    access_token VARCHAR(64) NOT NULL,
    container_id TEXT,
    frontend_root TEXT,
    backend_root TEXT,
    db_root TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_online TIMESTAMPTZ,
    CONSTRAINT ck_projects_status
        CHECK (status IN ('created', 'running', 'stopped')),
    CONSTRAINT uq_projects_access_token UNIQUE (access_token)
);

CREATE INDEX ix_projects_user_id ON projects (user_id);
CREATE INDEX ix_projects_status_last_online ON projects (status, last_online);

CREATE TABLE project_metadata (
    project_id VARCHAR(36) PRIMARY KEY
        REFERENCES projects(project_id) ON DELETE CASCADE,
    envs JSONB NOT NULL DEFAULT '[]'::jsonb,
    db_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
    pages JSONB NOT NULL DEFAULT '[]'::jsonb,
    endpoints JSONB NOT NULL DEFAULT '[]'::jsonb,
    groups JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE project_services (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL
        REFERENCES projects(project_id) ON DELETE CASCADE,
    service_id VARCHAR(36) NOT NULL
        REFERENCES services(id) ON DELETE RESTRICT,
    custom_start_command TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_project_services_pair UNIQUE (project_id, service_id)
);

CREATE INDEX ix_project_services_project_id
    ON project_services (project_id);

CREATE TABLE products (
    product_id VARCHAR(36) PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    stripe_price_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_products_price_nonnegative CHECK (price >= 0),
    CONSTRAINT uq_products_stripe_price_id UNIQUE (stripe_price_id)
);

INSERT INTO services (
    id,
    name,
    framework,
    category,
    default_start_command,
    default_port,
    scaffold_command,
    start_flags,
    default_packages
) VALUES
(
    '0fb36f4f-2c22-4ff3-a480-cf89cb971f02',
    'React',
    'React',
    'frontend',
    'npm run dev -- --host 0.0.0.0',
    5173,
    'create-vite {name} --template react',
    '--host 0.0.0.0',
    '[]'
),
(
    '2889f304-1853-4785-8f01-dfea8f87b294',
    'Next.js',
    'Next.js',
    'frontend',
    'npm run dev -- --hostname 0.0.0.0',
    3000,
    'create-next-app {name} --typescript --tailwind --eslint --app --src-dir --use-npm --yes',
    '--hostname 0.0.0.0',
    '[]'
),
(
    '4f5ad64d-dc9a-4221-b706-8bb0fb43899a',
    'Vue',
    'Vue',
    'frontend',
    'npm run dev -- --host 0.0.0.0',
    5173,
    'create-vite {name} --template vue',
    '--host 0.0.0.0',
    '[]'
),
(
    '6f60bf72-50d6-4f82-adfe-d6becae6a795',
    'Vanilla',
    'Vanilla',
    'frontend',
    'npm run dev -- --host 0.0.0.0',
    5173,
    'create-vite {name} --template vanilla',
    '--host 0.0.0.0',
    '[]'
),
(
    '8bedbf79-c96b-4ee5-a7dd-a146741a02a5',
    'FastAPI',
    'FastAPI',
    'backend',
    'uvicorn main:app --host 0.0.0.0 --port 8000',
    8000,
    NULL,
    '--host 0.0.0.0 --port 8000',
    '[]'
),
(
    'aa2a2253-7df5-45fd-b2d2-3dad7345a839',
    'Node.js',
    'Node.js',
    'backend',
    'npm start',
    8000,
    'express --no-view --force /app/workspace/backend && cd /app/workspace/backend && npm install',
    NULL,
    '[]'
),
(
    'b96d5496-b792-4db4-b1a2-44b366b136ef',
    'Express',
    'Express',
    'backend',
    'npm start',
    8000,
    NULL,
    NULL,
    '[]'
),
(
    'c9401a77-bbc3-4cf3-b9cb-ab186a9a8934',
    'Flask',
    'Flask',
    'backend',
    'flask run --host=0.0.0.0 --port=8000',
    8000,
    NULL,
    '--host=0.0.0.0 --port=8000',
    '[]'
),
(
    'db51e29a-b593-4d9b-8780-a6792169971f',
    'Actix Web',
    'Actix',
    'backend',
    'cargo run',
    8000,
    NULL,
    NULL,
    '[]'
),
(
    'eb8d9a36-a4b4-45d1-802f-bd6965c36502',
    'PostgreSQL',
    'PostgreSQL',
    'database',
    'su - postgres -c "pg_ctl -D /var/lib/postgresql/data start -w"',
    5432,
    NULL,
    NULL,
    '[]'
);

CREATE TABLE alembic_version (
    version_num VARCHAR(32) NOT NULL PRIMARY KEY
);

INSERT INTO alembic_version (version_num) VALUES ('20260730_0001');

COMMIT;
