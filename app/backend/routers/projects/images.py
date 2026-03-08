import io, re, tarfile, uuid, docker, os, json, boto3, structlog
from fastapi import APIRouter
from database import database
from routers.auth.auth_utils import get_current_user
from datetime import datetime
from .helpers.containerhelper import create_and_start_container, scaffold_template, _clean_name
from .helpers.base_images import ensure_exists

router = APIRouter()

logger = structlog.get_logger()

docker_client = docker.from_env()

def pick_base_image(backend_services: list, frontend_services: list, db: list) -> str:

    has_be = bool(backend_services)
    has_fe = bool(frontend_services)
    has_db = bool(db)

    if has_be and has_fe and has_db:
        return "fullstacktest"
    elif has_be:
        return "python"
    elif has_fe:
        return "node"
    else:
        return "minimal"


async def create_project_container(
    project_id: str,
    project_name: str,
    backend_services=None,
    frontend_services=None,
    db=None,
):
    """
    Orchestrates container creation and project scaffolding.
    """
    backend_services = backend_services or []
    frontend_services = frontend_services or []
    db = db or []

    # Fetch service configs
    all_services = backend_services + frontend_services + db
    service_configs = await database.fetch_all(
        """
        SELECT framework, default_port, scaffold_command, start_flags, default_packages
        FROM services
        WHERE framework = ANY(:frameworks)
        """,
        {"frameworks": all_services},
    )
    configs_map = {config["framework"]: config for config in service_configs}

    # Resolve frontend port
    frontend_port = next(
        (
            configs_map[fw]["default_port"]
            for fw in frontend_services
            if fw in configs_map and configs_map[fw]["default_port"]
        ),
        3000,
    )

    # Resolve base image and clean name
    base_type = pick_base_image(backend_services, frontend_services, db)
    base_tag = ensure_exists(base_type)
    clean_name = _clean_name(project_name)

    # Create and start the container
    result = create_and_start_container(
        project_id=project_id,
        project_name=project_name,
        base_tag=base_tag,
        base_type=base_type,
        clean_name=clean_name,
        frontend_port=frontend_port,
        backend_services=backend_services,
        frontend_services=frontend_services,
        db=db,
    )

    container = result["container"]

    # Scaffold frontend services
    for framework in frontend_services:
        if framework in configs_map and configs_map[framework]["scaffold_command"]:
            cmd = configs_map[framework]["scaffold_command"].replace("{name}", project_name)
            logger.info("Scaffolding frontend", framework=framework, cmd=cmd)
            container.exec_run(
                f"sh -c 'cd /app/workspace/frontend && {cmd}'",
                tty=True,
                detach=False,
            )

        if framework in configs_map and configs_map[framework]["default_packages"]:
            packages = " ".join(json.loads(configs_map[framework]["default_packages"]))
            container.exec_run(
                f"sh -c 'cd /app/workspace/frontend/{project_name} && npm install {packages}'",
                tty=True,
                detach=False,
            )
            logger.info("Installed default frontend packages", framework=framework, packages=packages)

        if "React" in frontend_services:
            scaffold_template(container, "React", f"/app/workspace/frontend/{project_name}")

    # Scaffold backend services
    for framework in backend_services:
        if "FastAPI" in backend_services:
            scaffold_template(container, "FastAPI", f"/app/workspace/backend")

        if framework in configs_map and configs_map[framework]["scaffold_command"]:
            cmd = configs_map[framework]["scaffold_command"].replace("{name}", project_name)
            logger.info("Scaffolding backend", framework=framework, cmd=cmd)
            container.exec_run(f"sh -c '{cmd}'", tty=True, detach=False)

    # Scaffold database services
    for framework in db:
        if framework in configs_map and configs_map[framework]["scaffold_command"]:
            cmd = configs_map[framework]["scaffold_command"].replace("{name}", project_name)
            logger.info("Scaffolding database", framework=framework, cmd=cmd)
            container.exec_run(
                f"sh -c 'cd /app/workspace/database && {cmd}'",
                tty=True,
                detach=False,
            )

    container.stop()  # Stop after scaffolding to save resources until user starts the project

    # Persist container ID to DB
    await database.execute(
        query="""
            UPDATE projects
            SET container_id = :container_id
            WHERE project_id = :project_id
        """,
        values={"container_id": container.id, "project_id": project_id},
    )

    return {
        **result["metadata"],
        "configs_map": configs_map,
    }


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
        container.stop(timeout=5)
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
