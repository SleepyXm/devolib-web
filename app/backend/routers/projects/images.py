import uuid
from fastapi import APIRouter, Depends, Body, HTTPException, WebSocket, WebSocketDisconnect
from database import database
from routers.auth.auth_utils import get_current_user
import docker
import os
from datetime import datetime
import json

router = APIRouter()

docker_client = docker.from_env()

NGINX_CONFIG_TEMPLATE = {"""No longer necessary"""}

async def create_project_image(project_id: str, project_name: str, backend_services=None, frontend_services=None, db=None):
    """
    Dynamically generates a Dockerfile with optional backend, frontend, and database services.
    Builds the image and saves the container ID in the database.
    """
    backend_services = backend_services or []
    frontend_services = frontend_services or []
    db = db or []
    image_tag = f"devolib_project_{project_id}"
    build_dir = f"/tmp/devolib_build_{project_id}"
    os.makedirs(build_dir, exist_ok=True)
    
    # Fetch all service configs from DB in one query
    all_services = backend_services + frontend_services + db
    config_query = """
    SELECT framework, default_port, scaffold_command, start_flags, packages
    FROM services 
    WHERE framework = ANY(:frameworks)
    """
    service_configs = await database.fetch_all(config_query, {"frameworks": all_services})
    
    # Build a lookup dict for easy access
    configs_map = {config['framework']: config for config in service_configs}
    
    # Base packages
    apk_packages = ["curl", "bash", "ca-certificates", "gnupg", "nginx"]
    
    # Add packages from all services
    for config in service_configs:
        if config['packages']:
            apk_packages.extend(config['packages'])
    
    # Get frontend port from first frontend service
    frontend_port = None
    for framework in frontend_services:
        if framework in configs_map and configs_map[framework]['default_port']:
            frontend_port = configs_map[framework]['default_port']
            break
    
    # Default to 80 if no frontend port found
    if frontend_port is None:
        frontend_port = 80
    
    apk_packages_str = " \\\n    ".join(set(apk_packages))
    
    # Create directories
    dirs = ["workspace", "workspace/frontend", "workspace/backend", "workspace/database"]
    dir_commands = "\n".join([f"RUN mkdir -p /app/{project_id}/{d}" for d in dirs])
    
    # Generate frontend setup commands from DB
    frontend_setup_commands = ""
    for framework in frontend_services:
        if framework in configs_map:
            scaffold_cmd = configs_map[framework]['scaffold_command']
            if scaffold_cmd:
                # Format the command with project name
                formatted_cmd = scaffold_cmd.format(name=project_name)
                frontend_setup_commands += f"""
# Setup {framework} project
WORKDIR /app/{project_id}/workspace/frontend
RUN {formatted_cmd}
"""
    
    dockerfile_content = f"""
FROM python:3.14.0-alpine
WORKDIR /app
{dir_commands}

# Install dependencies
RUN apk update && apk add --no-cache \\
    {apk_packages_str}

{frontend_setup_commands}

# Reset working directory
WORKDIR /app/{project_id}

# Traefik labels
LABEL traefik.enable="true"
LABEL traefik.http.routers.{project_id}.rule="Host(`{project_name}.localhost`)"
LABEL traefik.http.services.{project_id}.loadbalancer.server.port="{frontend_port}"

CMD ["sleep", "2400"]
"""
    
    dockerfile_path = os.path.join(build_dir, "Dockerfile")
    with open(dockerfile_path, "w") as f:
        f.write(dockerfile_content)
    
    try:
        image, logs = docker_client.images.build(
            path=build_dir,
            tag=image_tag,
            rm=True
        )
        image_id = image.id
        
    except docker.errors.BuildError as e:
        for line in e.build_log:
            print(line.get("stream", ""))
        raise Exception(f"Docker build failed: {e}")
    
    update_query = """
    UPDATE projects
    SET container_id = :container_id
    WHERE project_id = :project_id
    """
    await database.execute(
        query=update_query,
        values={"container_id": image_id, "project_id": project_id}
    )
    
    return image_id


async def delete_project_image(project_id: str):
    """
    Deletes the Docker image (and optionally running container) associated with a project.
    """
    image_tag = f"devolib_project_{project_id}"

    # stop and remove any running containers based on this image
    try:
        containers = docker_client.containers.list(all=True, filters={"ancestor": image_tag})
        for container in containers:
            container.stop()
            container.remove()
    except Exception as e:
        print(f"Error removing containers: {e}")

    # remove the image itself
    try:
        docker_client.images.remove(image=image_tag, force=True)
        print(f"Deleted image {image_tag}")
    except docker.errors.ImageNotFound:
        print(f"No image found for {image_tag}")
    except Exception as e:
        print(f"Error deleting image: {e}")