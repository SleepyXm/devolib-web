import docker
from database import database
from .helpers.containerhelper import create_and_start_container, scaffold_template
from helpers.dockerclient import docker_client
from helpers.structlogger import logger
from .containers.config import project_services_config
from .containers.scaffold import scaffold_import, scaffold_fresh, build_project_groups
from fastapi import HTTPException

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
        fresh_result= await scaffold_fresh(container, project_name, frontend_services, backend_services, db, configs_map)

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
        pages = fresh_result["pages"]
        endpoints = fresh_result["endpoints"]

    detected_frameworks = [f for f in [
        scan_result.frontend_framework,
        scan_result.backend_framework,
        scan_result.db_framework,
    ] if f] if scan_result else []

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
        "detected_frameworks": detected_frameworks,
    }


def get_container(project_id: str) -> docker.models.containers.Container:
    container_name = f"devolib_project_{project_id}"
    return docker_client.containers.get(container_name)



async def delete_project_container(project_id: str):
    volume_name = f"devolib_project_{project_id}"

    try:
        container = get_container(project_id)
        logger.info("Stopping container", project_id=project_id)
        container.stop(timeout=2)
        container.remove()
        logger.info("Container removed", project_id=project_id)
    except docker.errors.NotFound:
        logger.warning("Container not found", project_id=project_id)
    except Exception as e:
        logger.error("Error removing container", project_id=project_id, error=str(e))
        raise

    try:
        volume = docker_client.volumes.get(volume_name)
        volume.remove()
        logger.info("Volume removed", volume_name=volume_name)
    except docker.errors.NotFound:
        logger.warning("Volume not found", volume_name=volume_name)
    except Exception as e:
        logger.warning("Error removing volume", project_id=project_id, error=str(e))




async def start_container(project_id: str) -> docker.models.containers.Container:
    try:
        container = get_container(project_id)
        if container.status != "running":
            container.start()
    except docker.errors.NotFound:
        try:
            container = docker_client.containers.run(
                f"devolib_project_{project_id}",
                name=f"devolib_project_{project_id}",
                network="web",
                detach=True,
                tty=True,
                stdin_open=True,
                command="sh -c 'echo Container started!; tail -f /dev/null'",
            )
        except docker.errors.ImageNotFound:
            raise HTTPException(status_code=404, detail="Docker image not found")

    check = container.exec_run("pgrep logd", tty=False, detach=False)
    if check.exit_code != 0:
        container.exec_run("sh -c 'logd > /var/log/logd.log 2>&1 &'", tty=False, detach=True)
        logger.info("Started logd", project_id=project_id)
    else:
        logger.info("logd already running", project_id=project_id)

    await database.execute(
        "UPDATE projects SET last_online = NOW(), status = 'running' WHERE project_id = :project_id",
        {"project_id": project_id}
    )

    return container




async def stop_running_container(project_id: str) -> docker.models.containers.Container:
    container = get_container(project_id)
    container.stop(timeout=2)
    await database.execute(
        "UPDATE projects SET status = 'stopped' WHERE project_id = :project_id",
        {"project_id": project_id}
    )
    return container