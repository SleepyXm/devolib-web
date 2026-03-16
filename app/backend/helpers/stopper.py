from helpers.dockerclient import docker_client
from helpers.servicestates import services_alive, send_service_status
from database import database


async def stop_container(project_id: str):
    container_name = f"devolib_project_{project_id}"
    container = docker_client.containers.get(container_name)

    if project_id in services_alive:
        ws = services_alive[project_id].get("ws")
        print(f"ws for {project_id}: {ws}")
        if ws:
            await send_service_status(ws, {
                "container": False,
                "frontend": False,
                "backend": False,
                "database": False,
            })
        services_alive.pop(project_id, None)

    if container.status == "running":
        container.stop()

    await database.execute(
        "UPDATE projects SET status = 'stopped', last_online = NOW() WHERE project_id = :project_id",
        {"project_id": project_id}
    )
    return container