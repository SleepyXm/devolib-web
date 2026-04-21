import docker, os, json, structlog
from fastapi import APIRouter
from database import database
from datetime import datetime
from .helpers.containerhelper import create_and_start_container, scaffold_template
from .container import docker_client
from helpers.structlogger import logger
from .containers.config import project_services_config
from .containers.scaffold import scaffold_import, scaffold_fresh, build_project_groups


router = APIRouter()


async def create_project_container(
    project_id: str,
    project_name: str,
    backend_services=None,
    frontend_services=None,
    db=None,
    import_url=None,
):
    """
    Orchestrates container creation and project scaffolding.
    """
    backend_services = backend_services or []
    frontend_services = frontend_services or []
    db = db or []

    # Fetch service configs
    config = await project_services_config(project_name, backend_services, frontend_services, db)
    configs_map = config["configs_map"]

    # Create and start container
    result = create_and_start_container(
        project_id=project_id,
        project_name=project_name,
        base_tag=config["base_tag"],
        base_type=config["base_type"],
        clean_name=config["clean_name"],
        frontend_port=config["frontend_port"],
        backend_services=backend_services,
        frontend_services=frontend_services,
        db=db,
    )

    container = result["container"]
    scan_result = None

    if import_url:
        scan_result = await scaffold_import(container, import_url)
    else:
        await scaffold_fresh(container, project_name, frontend_services, backend_services, db, configs_map)

    scaffold_template(container, "LoggingService", "/")
    container.exec_run("sh -c 'logd &'", tty=True, detach=True)

    if import_url:
        repo_name = import_url.rstrip("/").split("/")[-1].removesuffix(".git")
        frontend_root = scan_result.frontend_root if scan_result and scan_result.frontend_root else f"/app/workspace/{repo_name}"
        backend_root = scan_result.backend_root if scan_result else None
        db_root = None
        pages = scan_result.pages if scan_result else []
        endpoints = scan_result.endpoints if scan_result else []
    else:
        frontend_root = f"/app/workspace/frontend/{project_name}"
        backend_root = "/app/workspace/backend"
        db_root = "/app/workspace/database"
        pages = []
        endpoints = []

    groups = build_project_groups(container, project_name, frontend_services, backend_services, scan_result)

    container.stop()

    await database.execute(
        """
        UPDATE projects
        SET container_id = :container_id
        WHERE project_id = :project_id
        """,
        {"container_id": container.id, "project_id": project_id},
    )

    return {
        **result["metadata"],
        "configs_map": configs_map,
        "scan": scan_result,
        "groups": groups,
        "frontend_root": frontend_root,
        "backend_root": backend_root,
        "db_root": db_root,
        "pages": pages,
        "endpoints": endpoints,
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
        container.stop(timeout=2)
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
