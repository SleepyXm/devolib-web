import re
import uuid
from fastapi import APIRouter
from database import database
from routers.auth.auth_utils import get_current_user
import docker
import os
from datetime import datetime
import json
from .base_images import ensure_exists, NETWORK_NAME
import structlog

router = APIRouter()

logger = structlog.get_logger()

docker_client = docker.from_env()

def pick_base_image(backend_services: list, frontend_services: list, db: list) -> str:
    
    has_be = bool(backend_services)
    has_fe = bool(frontend_services)
    has_db = bool(db)
    
    if has_be and has_fe and has_db:
        return 'fullstack'
    elif has_be:
        return 'python'
    elif has_fe:
        return 'node'
    else:
        return 'minimal'

async def create_project_container(
    project_id: str,
    project_name: str,
    backend_services=None,
    frontend_services=None,
    db=None
):
    """
    Create container from base image.
    """
    backend_services = backend_services or []
    frontend_services = frontend_services or []
    db = db or []
    
    # Fetch service configs from DB (keeping your existing logic)
    all_services = backend_services + frontend_services + db
    config_query = """
    SELECT framework, default_port, scaffold_command, start_flags, packages
    FROM services 
    WHERE framework = ANY(:frameworks)
    """
    service_configs = await database.fetch_all(config_query, {"frameworks": all_services})
    
    # Build lookup dict
    configs_map = {config['framework']: config for config in service_configs}
    
    # Get port from DB
    frontend_port = None
    for framework in frontend_services:
        if framework in configs_map and configs_map[framework]['default_port']:
            frontend_port = configs_map[framework]['default_port']
            break
    
    # Final fallback
    if frontend_port is None:
        frontend_port = 3000
    
    # Pick base image
    base_type = pick_base_image(backend_services, frontend_services, db)
    base_tag = ensure_exists(base_type)
    
    # Clean project name for DNS
    clean_name = _clean_name(project_name)
    
    try:
        logger.info(
            "Creating container",
            project_id=project_id,
            base=base_type,
            port=frontend_port,
            services=f"BE:{len(backend_services)} FE:{len(frontend_services)}"
        )
        
        container = docker_client.containers.create(
            image=base_tag,
            name=f"devolib_project_{project_id}",
            detach=True,
            
            # Traefik labels
            labels={
                "traefik.enable": "true",
                f"traefik.http.routers.{project_id}.rule": f"Host(`{clean_name}.localhost`)",
                f"traefik.http.services.{project_id}.loadbalancer.server.port": str(frontend_port),
                
                # Metadata for debugging
                "devolib.project_id": project_id,
                "devolib.project_name": project_name,
                "devolib.base": base_type,
                "devolib.backend_services": ",".join(backend_services),
                "devolib.frontend_services": ",".join(frontend_services),
                "devolib.db_services": ",".join(db),
            },
            
            # Persistent workspace volume
            volumes={
                f"devolib_project_{project_id}": {
                    'bind': '/app/workspace',
                    'mode': 'rw'
                }
            },
            
            # Join the web network (same as Traefik)
            network=NETWORK_NAME,
            
            # Resource limits
            mem_limit='512m',
            cpu_quota=50000,  # 50% of one core
            
            # Keep container alive
            command=["tail", "-f", "/dev/null"]
        )
        
        container.start()
        
        logger.info(
            "Container started",
            project_id=project_id,
            container_id=container.short_id,
            url=f"http://{clean_name}.localhost"
        )
        
        # Scaffold the project structure
        for framework in frontend_services:
            if framework in configs_map and configs_map[framework]['scaffold_command']:
                cmd = configs_map[framework]['scaffold_command'].replace('{name}', project_name)
                logger.info("Scaffolding frontend", framework=framework, cmd=cmd)
                container.exec_run(
                    f"sh -c 'cd /app/workspace/frontend && {cmd}'",
                    tty=True,
                    detach=False
                )
        
        for framework in backend_services:
            if framework in configs_map and configs_map[framework]['scaffold_command']:
                cmd = configs_map[framework]['scaffold_command'].replace('{name}', project_name)
                logger.info("Scaffolding backend", framework=framework, cmd=cmd)
                container.exec_run(
                    f"sh -c '{cmd}'",
                    tty=True,
                    detach=False
                )
        
        for framework in db:
            if framework in configs_map and configs_map[framework]['scaffold_command']:
                cmd = configs_map[framework]['scaffold_command'].replace('{name}', project_name)
                logger.info("Scaffolding database", framework=framework, cmd=cmd)
                container.exec_run(
                    f"sh -c 'cd /app/workspace/database && {cmd}'",
                    tty=True,
                    detach=False
                )
        
        # Update DB with container ID
        await database.execute(
            query="""
            UPDATE projects
            SET container_id = :container_id
            WHERE project_id = :project_id
            """,
            values={"container_id": container.id, "project_id": project_id}
        )
        
        # Return both container ID and service configs for scaffolding later
        return {
            "project_id": project_id,
            "container_id": container.id,
            "configs_map": configs_map,  # So you can use scaffold_command/start_flags elsewhere
            "port": frontend_port
        }
        
    except docker.errors.APIError as e:
        logger.error("Failed to create container", project_id=project_id, error=str(e))
        raise
    except Exception as e:
        logger.error("Unexpected error creating container", project_id=project_id, error=str(e))
        raise


def _clean_name(name: str) -> str:
    """Make project name DNS-safe for Traefik routing."""
    # Only allow alphanumeric and hyphens
    clean = re.sub(r'[^a-z0-9-]', '-', name.lower())
    # Remove consecutive hyphens
    clean = re.sub(r'-+', '-', clean)
    # Strip leading/trailing hyphens
    clean = clean.strip('-')
    # Fallback if empty
    return clean or f"proj-{hash(name) % 10000}"


async def delete_project_container(project_id: str):
    """
    Stop and remove container + volume.
    Base images stay cached - no deletion needed.
    """
    container_name = f"devolib_project_{project_id}"
    volume_name = f"devolib_project_{project_id}"
    
    # Remove container
    try:
        container = docker_client.containers.get(container_name)
        logger.info("Stopping container", project_id=project_id)
        container.stop(timeout=10)
        container.remove()
        logger.info("Container removed", project_id=project_id)
    except docker.errors.NotFound:
        logger.warning("Container not found", container_name=container_name)
    except Exception as e:
        logger.error("Error removing container", project_id=project_id, error=str(e))
        raise
    
    # Remove volume
    try:
        volume = docker_client.volumes.get(volume_name)
        volume.remove()
        logger.info("Volume removed", volume_name=volume_name)
    except docker.errors.NotFound:
        logger.warning("Volume not found", volume_name=volume_name)
    except Exception as e:
        logger.warning("Error removing volume", project_id=project_id, error=str(e))