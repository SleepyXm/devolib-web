import uuid
from fastapi import APIRouter, Depends, Body, HTTPException, WebSocket, WebSocketDisconnect
from database import database
from routers.auth.auth_utils import get_current_user
import docker
import os
from datetime import datetime
import asyncio

router = APIRouter()

docker_client = docker.from_env()

async def create_project_image(project_id: str, project_name: str):
    """
    1. Dynamically generates a Dockerfile for the project.
    2. Builds a Docker image.
    3. Saves the image ID in the projects table.
    """
    image_tag = f"devolib_project_{project_id}"


    build_dir = f"/tmp/devolib_build_{project_id}"
    os.makedirs(build_dir, exist_ok=True)

    ENV_path_string = '/root/.cargo/bin:${PATH}'

    dockerfile_content = f"""
    FROM python:3.14.0-alpine
    WORKDIR /app
    RUN mkdir -p /app/{project_id}/workspace

    # Install dependencies for Python, Node.js, Rust
    RUN apk update && apk add --no-cache \
        curl \
        build-base \
        ca-certificates \
        bash \
        gnupg \
        nodejs \
        npm

    # Install Node.js (latest LTS)
    RUN apk add --no-cache nodejs npm

    # Install Rust via rustup (non-interactive)
    #RUN curl https://sh.rustup.rs -sSf | sh -s -- -y
    #ENV PATH="{ENV_path_string}"

    # Optional: copy pre-existing starter code here if you want
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

    # Try to remove any running containers using this image
    try:
        containers = docker_client.containers.list(all=True, filters={"ancestor": image_tag})
        for container in containers:
            container.stop()
            container.remove()
    except Exception as e:
        print(f"Error removing containers: {e}")

    # Try to remove the image itself
    try:
        docker_client.images.remove(image=image_tag, force=True)
        print(f"Deleted image {image_tag}")
    except docker.errors.ImageNotFound:
        print(f"No image found for {image_tag}")
    except Exception as e:
        print(f"Error deleting image: {e}")


@router.get("/list")
async def list_projects(current_user: dict = Depends(get_current_user)):
    query = "SELECT project_id, name, status, container_id, created_at FROM projects WHERE user_id = :user_id"
    projects = await database.fetch_all(query=query, values={"user_id": current_user["id"]})
    return {"projects": projects}

@router.get("/hi")
async def hi():
    return {"message": "Projects router is working!"}

@router.post("/create")
async def create_project(
    name: str = Body(..., embed=True),
    current_user: dict = Depends(get_current_user)
):
    project_id = str(uuid.uuid4())

    insert_query = """
    INSERT INTO projects (project_id, user_id, name, status, created_at)
    VALUES (:project_id, :user_id, :name, 'created', NOW())
    """
    await database.execute(
        query=insert_query,
        values={
            "project_id": project_id,
            "user_id": current_user["id"],
            "name": name,
        },
    )

    image_id = await create_project_image(project_id, name)

    return {"ok": True, "project_id": project_id, "image_id": image_id, "name": name}

@router.post("/start/{project_id}")
async def start_project_container(project_id: str):
    """
    Starts the Docker container for a given project.
    """
    container_name = f"devolib_project_{project_id}"
    
    try:
        # Check if container already exists
        container = docker_client.containers.get(container_name)
        if container.status != "running":
            container.start()
    except docker.errors.NotFound:
        # If container doesn't exist, start it from image
        image_tag = f"devolib_project_{project_id}"
        try:
            container = docker_client.containers.run(
                image_tag,
                name=container_name,
                detach=True,
                tty=True,
                stdin_open=True,
                command = "sh -c 'echo Container started!; tail -f /dev/null'",  # keep it alive for (test limit i got scared when i couldnt figure out how to turn it off lol)
            )
        except docker.errors.ImageNotFound:
            raise HTTPException(status_code=404, detail="Docker image not found")
    
    return {"ok": True, "container_id": container.id, "status": container.status}



@router.post("/stop/{project_id}")
async def stop_project_container(project_id: str):
    container_name = f"devolib_project_{project_id}"
    try:
        container = docker_client.containers.get(container_name)
        if container.status == "running":
            container.stop()
        return {"ok": True, "container_id": container.id, "status": container.status}
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail="Container not found")
    

@router.delete("/delete")
async def delete_project(
    project_id: str = Body(..., embed=True),
    current_user: dict = Depends(get_current_user)
    ):

    select_query = """
    SELECT * FROM projects
    WHERE project_id = :project_id AND user_id = :user_id
    """
    project = await database.fetch_one(
        query=select_query,
        values={"project_id": project_id, "user_id": current_user["id"]}
    )

    if not project:
        raise HTTPException(status_code=404, detail="Project not found or not owned by user")


    await delete_project_image(project_id)


    delete_query = "DELETE FROM projects WHERE project_id = :project_id"
    await database.execute(query=delete_query, values={"project_id": project_id})

    return {"ok": True, "project_id": project_id, "deleted": True}


@router.websocket("/ws/{project_id}")
async def websocket_terminal(websocket: WebSocket, project_id: str):
    await websocket.accept()

    container_name = f"devolib_project_{project_id}"
    try:
        container = docker_client.containers.get(container_name)
    except docker.errors.NotFound:
        await websocket.close(code=1000)
        return

    await websocket.send_text(f"User connected at {datetime.utcnow().isoformat()}!\n")
    current_dir = f"/app/{project_id}/workspace"  # starting directory inside container

    while True:
        try:
            cmd = await websocket.receive_text()
            if not cmd.strip():
                continue

            # Handle `cd` separately
            if cmd.startswith("cd "):
                target = cmd[3:].strip()
                # Optionally validate path
                current_dir = f"{current_dir}/{target}".replace("//", "/")
                await websocket.send_text(f"Changed directory to {current_dir}\n")
                continue

            # Prepend current_dir for all other commands
            result = container.exec_run(f"bash -c 'cd {current_dir} && {cmd}'", demux=True)
            stdout, stderr = result.output
            if stdout:
                await websocket.send_text(stdout.decode())
            if stderr:
                await websocket.send_text(stderr.decode())

        except WebSocketDisconnect:
            break