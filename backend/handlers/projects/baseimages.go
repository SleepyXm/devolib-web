package handlers

import (
	"archive/tar"
	"context"
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"
)

type ImageConfig struct {
	Tag         string
	Description string
}

var BaseImages = map[string]ImageConfig{
	"minimal": {
		Tag:         "devolib_minimal:latest",
		Description: "Essentials only - ~300MB",
	},
	"python": {
		Tag:         "devolib_python:latest",
		Description: "Python + common packages - ~500MB",
	},
	"node": {
		Tag:         "devolib_node:latest",
		Description: "Node + cached npm packages - ~600MB",
	},
	"fullstack": {
		Tag:         "devolib_fullstack:latest",
		Description: "Python + Node - ~1.2GB",
	},
	"fullstacktest": {
		Tag:         "devolib_fullstacktest:latest",
		Description: "Python + Node - ~1.2GB",
	},
	"postgres": {
		Tag:         "devolib_postgres:latest",
		Description: "PostgreSQL 16 - ~200MB",
	},
	"mysql": {
		Tag:         "devolib_mysql:latest",
		Description: "MySQL - ~400MB",
	},
}

var minimalDockerfile = `
FROM python:3.14-alpine
RUN apk update && apk add --no-cache \
    curl bash ca-certificates git openssh-client build-base \
    && rm -rf /var/cache/apk/*
RUN mkdir -p /app/workspace/frontend
RUN mkdir -p /app/workspace/backend
RUN mkdir -p /app/workspace/database
WORKDIR /app/workspace
CMD ["tail", "-f", "/dev/null"]
`

var pythonDockerfile = `
FROM devolib_minimal:latest
RUN pip install --no-cache-dir \
    fastapi \
    uvicorn[standard] \
    pydantic \
    sqlalchemy \
    psycopg2-binary \
    redis \
    httpx
RUN apk add --no-cache postgresql openssh-client mysql \
    && rm -rf /var/cache/apk/*
WORKDIR /app/workspace
CMD ["tail", "-f", "/dev/null"]
`

var nodeDockerfile = `
FROM node:20-alpine
RUN apk update && apk add --no-cache \
    curl bash ca-certificates git openssh-client python3 make g++ \
    && rm -rf /var/cache/apk/*
RUN npm config set yes true --global && \
    npm config set update-notifier false --global && \
    npm config set fund false --global
RUN npm install -g --force \
    create-react-app@latest \
    create-next-app@latest \
    @vue/cli@latest \
    create-vite@latest \
    express-generator@latest \
    typescript@latest \
    && npm cache clean --force
RUN mkdir -p /tmp/cache && cd /tmp/cache && \
    npm init -y && \
    npm install \
        react@latest \
        react-dom@latest \
        react-router-dom \
        axios \
        @tanstack/react-query \
    && cd / && rm -rf /tmp/cache
RUN mkdir -p /app/workspace/frontend /app/workspace/backend /app/workspace/database
WORKDIR /app/workspace
CMD ["tail", "-f", "/dev/null"]
`

var fullstackDockerfile = `
FROM python:3.14-alpine
RUN apk update && apk add --no-cache \
    curl bash ca-certificates git openssh-client build-base \
    nodejs npm postgresql mysql \
    python3 make g++ \
    && rm -rf /var/cache/apk/*
RUN pip install --no-cache-dir \
    fastapi uvicorn[standard] pydantic sqlalchemy \
    psycopg2-binary redis httpx
RUN curl -fsSL https://bun.sh/install | bash
ENV BUN_INSTALL="/root/.bun"
ENV PATH="$BUN_INSTALL/bin:$PATH"
RUN npm config set yes true --global && \
    npm config set update-notifier false --global && \
    npm config set fund false --global
RUN npm install -g --force \
    create-react-app@latest \
    create-next-app@latest \
    @vue/cli@latest \
    create-vite@latest \
    express-generator@latest \
    typescript@latest \
    tailwindcss@latest \
    && npm cache clean --force
RUN mkdir -p /tmp/cache && cd /tmp/cache && \
    npm init -y && \
    npm install \
        react@latest \
        react-dom@latest \
        react-router-dom \
        axios \
        @tanstack/react-query \
    && cd / && rm -rf /tmp/cache
RUN mkdir -p /var/lib/postgresql/data && \
    chown -R postgres:postgres /var/lib/postgresql && \
    su - postgres -c "initdb -D /var/lib/postgresql/data"
RUN mkdir -p /run/postgresql && chown postgres:postgres /run/postgresql
RUN su - postgres -c "pg_ctl -D /var/lib/postgresql/data start -w && \
    psql -c 'CREATE DATABASE myapp;' && \
    pg_ctl -D /var/lib/postgresql/data stop"
RUN mkdir -p /app/workspace/frontend /app/workspace/backend /app/workspace/database
WORKDIR /app/workspace
CMD ["tail", "-f", "/dev/null"]
`

var fullstacktestDockerfile = `
FROM devolib_minimal:latest
RUN apk update && apk add --no-cache \
    curl bash ca-certificates git openssh-client build-base \
    nodejs npm postgresql postgresql-contrib \
    python3 make g++ \
    && rm -rf /var/cache/apk/*
RUN pip install --no-cache-dir \
    fastapi uvicorn[standard] pydantic sqlalchemy asyncpg \
    psycopg2-binary redis httpx \
    python-dotenv alembic python-multipart \
    passlib python-jose \
    pytest pytest-asyncio pytest-cov
RUN curl -fsSL https://bun.sh/install | bash
ENV BUN_INSTALL="/root/.bun"
ENV PATH="$BUN_INSTALL/bin:$PATH"
RUN npm config set yes true --global && \
    npm config set update-notifier false --global && \
    npm config set fund false --global
RUN npm install -g --force \
    create-next-app@latest \
    @vue/cli@latest \
    create-vite@7 \
    express-generator@latest \
    typescript@latest \
    tailwindcss@latest
ENV NODE_PATH=/opt/npm_cache/node_modules
RUN mkdir -p /opt/npm_cache && cd /opt/npm_cache && \
    npm init -y && \
    npm install \
        vite@latest esbuild@latest rollup@latest \
        @vitejs/plugin-react@latest \
        postcss@latest autoprefixer@latest \
        ts-node@latest \
        @types/node@latest @types/react@latest @types/react-dom@latest \
        dotenv cors express body-parser uuid \
        axios @tanstack/react-query react-router-dom \
        react-hook-form zod clsx date-fns
ENV BUN_INSTALL_CACHE_DIR=/opt/bun_cache
RUN mkdir -p /opt/bun_cache && cd /opt/bun_cache && \
    bun init -y && \
    bun add \
        vite esbuild @vitejs/plugin-react \
        postcss autoprefixer \
        @types/node @types/react @types/react-dom \
        dotenv axios @tanstack/react-query react-router-dom \
        react-hook-form zod clsx date-fns
RUN mkdir -p /var/lib/postgresql/data && \
    chown -R postgres:postgres /var/lib/postgresql && \
    su - postgres -c "initdb -D /var/lib/postgresql/data"
RUN echo "shared_buffers = 32MB" >> /var/lib/postgresql/data/postgresql.conf && \
    echo "work_mem = 4MB" >> /var/lib/postgresql/data/postgresql.conf && \
    echo "maintenance_work_mem = 32MB" >> /var/lib/postgresql/data/postgresql.conf && \
    echo "max_connections = 20" >> /var/lib/postgresql/data/postgresql.conf
RUN mkdir -p /run/postgresql && chown postgres:postgres /run/postgresql
RUN su - postgres -c "pg_ctl -D /var/lib/postgresql/data start -w && \
    psql -c 'CREATE DATABASE myapp;' && \
    pg_ctl -D /var/lib/postgresql/data stop"
RUN mkdir -p /app/workspace/frontend /app/workspace/backend /app/workspace/database
WORKDIR /app/workspace
CMD ["tail", "-f", "/dev/null"]
`

var postgresDockerfile = `
FROM postgres:16-alpine
ENV POSTGRES_USER=devolib
ENV POSTGRES_PASSWORD=devolib
ENV POSTGRES_DB=devolib
RUN mkdir -p /docker-entrypoint-initdb.d
WORKDIR /var/lib/postgresql/data
`

var mysqlDockerfile = `
FROM alpine/mysql:latest
ENV MYSQL_ROOT_PASSWORD=devolib
ENV MYSQL_DATABASE=devolib
ENV MYSQL_USER=devolib
ENV MYSQL_PASSWORD=devolib
`

var dockerfiles = map[string]string{
	"minimal":       minimalDockerfile,
	"python":        pythonDockerfile,
	"node":          nodeDockerfile,
	"fullstack":     fullstackDockerfile,
	"fullstacktest": fullstacktestDockerfile,
	"postgres":      postgresDockerfile,
	"mysql":         mysqlDockerfile,
}

// Builder holds a Docker client and logger.
type Builder struct {
	cli *client.Client
	log *slog.Logger
}

func NewBuilder(cli *client.Client, log *slog.Logger) *Builder {
	return &Builder{cli: cli, log: log}
}

// Build builds a single image by type.
func (b *Builder) Build(ctx context.Context, imageType string) error {
	cfg, ok := BaseImages[imageType]
	if !ok {
		return fmt.Errorf("unknown image type: %s", imageType)
	}
	dockerfile, ok := dockerfiles[imageType]
	if !ok {
		return fmt.Errorf("no dockerfile for image type: %s", imageType)
	}
	return b.build(ctx, imageType, cfg.Tag, dockerfile)
}

// EnsureExists checks if an image exists and builds it (with dependencies) if not.
func (b *Builder) EnsureExists(ctx context.Context, imageType string) (string, error) {
	cfg, ok := BaseImages[imageType]
	if !ok {
		return "", fmt.Errorf("unknown image type: %s", imageType)
	}

	_, _, err := b.cli.ImageInspectWithRaw(ctx, cfg.Tag)
	if err == nil {
		b.log.Debug("image already exists", "tag", cfg.Tag)
		return cfg.Tag, nil
	}

	b.log.Info("image not found, building", "tag", cfg.Tag)

	switch imageType {
	case "python", "fullstacktest":
		if _, err := b.EnsureExists(ctx, "minimal"); err != nil {
			return "", fmt.Errorf("building dependency minimal: %w", err)
		}
	}

	if err := b.Build(ctx, imageType); err != nil {
		return "", err
	}

	return cfg.Tag, nil
}

// BuildAll builds all images in dependency order.
func (b *Builder) BuildAll(ctx context.Context) error {
	order := []string{"minimal", "python", "node", "fullstack", "fullstacktest", "postgres", "mysql"}
	b.log.Info("building all base images")
	for _, imageType := range order {
		if err := b.Build(ctx, imageType); err != nil {
			return fmt.Errorf("building %s: %w", imageType, err)
		}
	}
	b.log.Info("all base images built")
	return nil
}

func (b *Builder) build(ctx context.Context, imageType, tag, dockerfile string) error {
	buildDir, err := os.MkdirTemp("", "devolib_build_"+imageType)
	if err != nil {
		return fmt.Errorf("creating temp dir: %w", err)
	}
	defer os.RemoveAll(buildDir)

	if err := os.WriteFile(filepath.Join(buildDir, "Dockerfile"), []byte(dockerfile), 0644); err != nil {
		return fmt.Errorf("writing dockerfile: %w", err)
	}

	// Create a tar archive of the build context for the Docker API.
	tarPath := filepath.Join(buildDir, "context.tar")
	if err := createTar(buildDir, tarPath); err != nil {
		return fmt.Errorf("creating build context tar: %w", err)
	}

	f, err := os.Open(tarPath)
	if err != nil {
		return fmt.Errorf("opening build context: %w", err)
	}
	defer f.Close()

	b.log.Info("building base image", "type", imageType)

	resp, err := b.cli.ImageBuild(ctx, f, types.ImageBuildOptions{
		Tags:           []string{tag},
		Remove:         true,
		ForceRemove:    true,
		SuppressOutput: false,
	})
	if err != nil {
		return fmt.Errorf("docker build failed: %w", err)
	}
	defer resp.Body.Close()

	// Drain the build output (required; also surfaces any build errors).
	if _, err := io.Copy(io.Discard, resp.Body); err != nil {
		return fmt.Errorf("reading build output: %w", err)
	}

	info, _, err := b.cli.ImageInspectWithRaw(ctx, tag)
	if err != nil {
		return fmt.Errorf("inspecting built image: %w", err)
	}
	sizeMB := float64(info.Size) / 1024 / 1024
	b.log.Info("image built", "tag", tag, "size_mb", fmt.Sprintf("%.1f", sizeMB))

	return nil
}

// createTar tars the build directory (excluding the tar file itself).
func createTar(srcDir, destTar string) error {
	f, err := os.Create(destTar)
	if err != nil {
		return err
	}
	defer f.Close()

	tw := tar.NewWriter(f) // import "archive/tar"
	defer tw.Close()

	return filepath.Walk(srcDir, func(path string, info os.FileInfo, err error) error {
		if err != nil || path == destTar {
			return err
		}
		rel, err := filepath.Rel(srcDir, path)
		if err != nil {
			return err
		}
		hdr, err := tar.FileInfoHeader(info, "")
		if err != nil {
			return err
		}
		hdr.Name = filepath.ToSlash(rel)
		if err := tw.WriteHeader(hdr); err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}
		src, err := os.Open(path)
		if err != nil {
			return err
		}
		defer src.Close()
		_, err = io.Copy(tw, src)
		return err
	})
}
