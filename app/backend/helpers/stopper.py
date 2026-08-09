from helpers.dockerclient import docker_client
from database import database
import asyncio


async def stop_container(project_id: str):
    container_name = f"devolib_project_{project_id}"
    container = await asyncio.to_thread(docker_client.containers.get, container_name)
    if container.status == "running":
        await asyncio.to_thread(container.stop)
    await database.execute(
        "UPDATE projects SET status = 'stopped', last_online = NOW() WHERE project_id = :project_id",
        {"project_id": project_id}
    )
    return container
