from pathlib import Path
import docker
import shutil
from helpers.dockerclient import docker_client
from helpers.structlogger import logger

NETWORK_NAME = "web"

BASE_IMAGES = {
    'minimal': {
        'tag': 'devolib_minimal:latest',
        'description': 'Essentials only - ~300MB'
    },
    'python': {
        'tag': 'devolib_python:latest',
        'description': 'Python + common packages - ~500MB'
    },
    'node': {
        'tag': 'devolib_node:latest',
        'description': 'Node + cached npm packages - ~600MB'
    },
    'fullstack': {
        'tag': 'devolib_fullstack:latest',
        'description': 'Python + Node - ~1.2GB'
    },
    'fullstacktest': {
        'tag': 'devolib_fullstacktest:latest',
        'description': 'Python + Node - ~1.2GB'
    },
    'postgres': {
        'tag': 'devolib_postgres:latest',
        'description': 'PostgreSQL 16 - ~200MB'
    },
    'mysql': {
        'tag': 'devolib_mysql:latest',
        'description': 'MySQL - ~400MB'
    }
}


def build_minimal():
    """Bare minimum - just package managers."""
    dockerfile = """
FROM python:3.14-alpine
RUN apk update && apk add --no-cache \\
    curl bash ca-certificates git openssh-client build-base \\
    && rm -rf /var/cache/apk/*
RUN mkdir -p /app/workspace/frontend
RUN mkdir -p /app/workspace/backend
RUN mkdir -p /app/workspace/database
WORKDIR /app/workspace
CMD ["tail", "-f", "/dev/null"]
"""
    return _build('minimal', dockerfile)


def build_python():
    """Python backend stack."""
    dockerfile = """
FROM devolib_minimal:latest
RUN pip install --no-cache-dir \\
    fastapi \\
    uvicorn[standard] \\
    pydantic \\
    sqlalchemy \\
    psycopg2-binary \\
    redis \\
    httpx
RUN apk add --no-cache postgresql openssh-client mysql \\
    && rm -rf /var/cache/apk/*
WORKDIR /app/workspace
CMD ["tail", "-f", "/dev/null"]
"""
    return _build('python', dockerfile)


def build_node():
    """Node stack with npm cache."""
    dockerfile = """
FROM node:20-alpine
RUN apk update && apk add --no-cache \\
    curl bash ca-certificates git openssh-client python3 make g++ \\
    && rm -rf /var/cache/apk/*

# CRITICAL: Set npm to auto-confirm and disable update checks
RUN npm config set yes true --global && \\
    npm config set update-notifier false --global && \\
    npm config set fund false --global

# Global tools with --force to remove prompts
RUN npm install -g --force \\
    create-react-app@latest \\
    create-next-app@latest \\
    @vue/cli@latest \\
    create-vite@latest \\
    express-generator@latest \\
    typescript@latest \\
    && npm cache clean --force

# Cache common packages
RUN mkdir -p /tmp/cache && cd /tmp/cache && \\
    npm init -y && \\
    npm install \\
        react@latest \\
        react-dom@latest \\
        react-router-dom \\
        axios \\
        @tanstack/react-query \\
    && cd / && rm -rf /tmp/cache

RUN mkdir -p /app/workspace/frontend
RUN mkdir -p /app/workspace/backend
RUN mkdir -p /app/workspace/database

WORKDIR /app/workspace
CMD ["tail", "-f", "/dev/null"]
"""
    return _build('node', dockerfile)

def build_mysql():
    """MySQL database image."""
    dockerfile = """
FROM alpine/mysql:latest
ENV MYSQL_ROOT_PASSWORD=devolib
ENV MYSQL_DATABASE=devolib
ENV MYSQL_USER=devolib
ENV MYSQL_PASSWORD=devolib
"""
    return _build('mysql', dockerfile)

def build_postgres():
    """PostgreSQL database image."""
    dockerfile = """
FROM postgres:16-alpine
ENV POSTGRES_USER=devolib
ENV POSTGRES_PASSWORD=devolib
ENV POSTGRES_DB=devolib
RUN mkdir -p /docker-entrypoint-initdb.d
WORKDIR /var/lib/postgresql/data
"""
    return _build('postgres', dockerfile)


def build_fullstack():
    """Both ecosystems in one."""
    dockerfile = """
FROM python:3.14-alpine

# System deps
RUN apk update && apk add --no-cache \\
    curl bash ca-certificates git openssh-client build-base \\
    nodejs npm postgresql mysql \\
    python3 make g++ \\
    && rm -rf /var/cache/apk/*

# Python packages
RUN pip install --no-cache-dir \\
    fastapi uvicorn[standard] pydantic sqlalchemy \\
    psycopg2-binary redis httpx

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV BUN_INSTALL="/root/.bun"
ENV PATH="$BUN_INSTALL/bin:$PATH"


# CRITICAL: Set npm to auto-confirm
RUN npm config set yes true --global && \\
    npm config set update-notifier false --global && \\
    npm config set fund false --global

# Node tools - with all the frameworks
RUN npm install -g --force \\
    create-react-app@latest \\
    create-next-app@latest \\
    @vue/cli@latest \\
    create-vite@latest \\
    express-generator@latest \\
    typescript@latest \\
    tailwindcss@latest \\
    && npm cache clean --force

# Cache npm packages
RUN mkdir -p /tmp/cache && cd /tmp/cache && \\
    npm init -y && \\
    npm install \\
        react@latest \\
        react-dom@latest \\
        react-router-dom \\
        axios \\
        @tanstack/react-query \\
    && cd / && rm -rf /tmp/cache

# Initialize postgres database
RUN mkdir -p /var/lib/postgresql/data && \\
    chown -R postgres:postgres /var/lib/postgresql && \\
    su - postgres -c "initdb -D /var/lib/postgresql/data"
RUN mkdir -p /run/postgresql && \\
    chown postgres:postgres /run/postgresql

RUN su - postgres -c "pg_ctl -D /var/lib/postgresql/data start -w && \
    psql -c 'CREATE DATABASE myapp;' && \
    pg_ctl -D /var/lib/postgresql/data stop"

RUN mkdir -p /app/workspace/frontend
RUN mkdir -p /app/workspace/backend
RUN mkdir -p /app/workspace/database

WORKDIR /app/workspace
CMD ["tail", "-f", "/dev/null"]
"""
    return _build('fullstack', dockerfile)


def build_fullstacktest():
    """Both ecosystems in one."""
    dockerfile = """
FROM devolib_minimal:latest

# System deps
RUN apk update && apk add --no-cache \\
    curl bash ca-certificates git openssh-client build-base \\
    nodejs npm postgresql postgresql-contrib \\
    python3 make g++ \\
    && rm -rf /var/cache/apk/*

# Python runtime — fastapi backend focused
RUN pip install --no-cache-dir \\
    fastapi uvicorn[standard] pydantic sqlalchemy asyncpg \\
    psycopg2-binary redis httpx \\
    python-dotenv alembic python-multipart \\
    passlib python-jose \\
    pytest pytest-asyncio pytest-cov

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV BUN_INSTALL="/root/.bun"
ENV PATH="$BUN_INSTALL/bin:$PATH"

# npm config
RUN npm config set yes true --global && \\
    npm config set update-notifier false --global && \\
    npm config set fund false --global

# Global scaffolding tools
RUN npm install -g --force \\
    create-next-app@latest \\
    @vue/cli@latest \\
    create-vite@7 \\
    express-generator@latest \\
    typescript@latest \\
    tailwindcss@latest

# Pre-cache frontend runtime deps (invisible ones users forget)
# NODE_PATH lets any project resolve these without reinstalling
ENV NODE_PATH=/opt/npm_cache/node_modules
RUN mkdir -p /opt/npm_cache && cd /opt/npm_cache && \\
    npm init -y && \\
    npm install \\
        vite@latest \\
        esbuild@latest \\
        rollup@latest \\
        @vitejs/plugin-react@latest \\
        postcss@latest \\
        autoprefixer@latest \\
        ts-node@latest \\
        @types/node@latest \\
        @types/react@latest \\
        @types/react-dom@latest \\
        dotenv \\
        cors \\
        express \\
        body-parser \\
        uuid \\
        axios \\
        @tanstack/react-query \\
        react-router-dom \\
        react-hook-form \\
        zod \\
        clsx \\
        date-fns

# Mirror the same cache for bun
ENV BUN_INSTALL_CACHE_DIR=/opt/bun_cache
RUN mkdir -p /opt/bun_cache && cd /opt/bun_cache && \\
    bun init -y && \\
    bun add \\
        vite \\
        esbuild \\
        @vitejs/plugin-react \\
        postcss \\
        autoprefixer \\
        @types/node \\
        @types/react \\
        @types/react-dom \\
        dotenv \\
        axios \\
        @tanstack/react-query \\
        react-router-dom \\
        react-hook-form \\
        zod \\
        clsx \\
        date-fns

# Postgres setup
RUN mkdir -p /var/lib/postgresql/data && \\
    chown -R postgres:postgres /var/lib/postgresql && \\
    su - postgres -c "initdb -D /var/lib/postgresql/data"

# Tune postgres memory
RUN echo "shared_buffers = 32MB" >> /var/lib/postgresql/data/postgresql.conf && \\
    echo "work_mem = 4MB" >> /var/lib/postgresql/data/postgresql.conf && \\
    echo "maintenance_work_mem = 32MB" >> /var/lib/postgresql/data/postgresql.conf && \\
    echo "max_connections = 20" >> /var/lib/postgresql/data/postgresql.conf

RUN mkdir -p /run/postgresql && \\
    chown postgres:postgres /run/postgresql
    
RUN su - postgres -c "pg_ctl -D /var/lib/postgresql/data start -w && \\
    psql -c 'CREATE DATABASE myapp;' && \\
    pg_ctl -D /var/lib/postgresql/data stop"

RUN mkdir -p /app/workspace/frontend
RUN mkdir -p /app/workspace/backend
RUN mkdir -p /app/workspace/database

WORKDIR /app/workspace
CMD ["tail", "-f", "/dev/null"]
"""
    return _build('fullstacktest', dockerfile)

def _build(image_type: str, dockerfile: str):
    """Build helper."""
    tag = BASE_IMAGES[image_type]['tag']
    build_dir = Path(f"/tmp/devolib_build_{image_type}")
    build_dir.mkdir(exist_ok=True)
    
    try:
        (build_dir / "Dockerfile").write_text(dockerfile)
        
        logger.info(f"Building {image_type} base image...")
        image, logs = docker_client.images.build(
            path=str(build_dir),
            tag=tag,
            rm=True,
            forcerm=True
        )
        
        size_mb = image.attrs['Size'] / 1024 / 1024
        logger.info(f"[✓] Built {tag} ({size_mb:.1f}MB)")
        return image.id
        
    except Exception as e:
        logger.error(f"[✗] Failed to build {image_type}: {e}")
        raise
    finally:
        shutil.rmtree(build_dir, ignore_errors=True)

def build_all():
    """Build all bases in order (minimal first, others depend on it)."""
    logger.info("Building all base images...")
    build_minimal()
    build_python()
    build_node()
    build_fullstack()
    build_postgres()
    build_mysql()
    logger.info("[✓] All base images built")

def ensure_exists(image_type: str) -> str:
    """Check if image exists, build if not."""
    tag = BASE_IMAGES[image_type]['tag']
    try:
        docker_client.images.get(tag)
        logger.debug(f"[✓] {tag} already exists")
        return tag
    except docker.errors.ImageNotFound:
        logger.info(f"[✗] {tag} not found, building...")
        
        if image_type == 'python':
            ensure_exists('minimal')
            build_python()
        elif image_type == 'node':
            build_node()
        elif image_type == 'fullstack':
            build_fullstack()
        elif image_type == 'fullstacktest':
            build_fullstacktest()
        elif image_type == 'postgres':
            build_postgres()
        elif image_type == 'mysql':
            build_mysql()
        else:
            build_minimal()
        
        return tag