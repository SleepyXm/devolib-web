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
    RUN mkdir -p /app/{project_id}/workspace/frontend
    RUN mkdir -p /app/{project_id}/workspace/backend
    RUN mkdir -p /app/{project_id}/workspace/database

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
async def start_project_container(project_id: str, current_user: dict = Depends(get_current_user)):

    select_query = "SELECT * FROM projects WHERE project_id = :project_id AND user_id = :user_id"
    project = await database.fetch_one(query=select_query, values={"project_id": project_id, "user_id": current_user["id"]})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or not owned by user")
    
    container_name = f"devolib_project_{project_id}"
    try:
        container = docker_client.containers.get(container_name)
        if container.status != "running":
            container.start()
    except docker.errors.NotFound:
        image_tag = f"devolib_project_{project_id}"
        try:
            container = docker_client.containers.run(
                image_tag,
                name=container_name,
                detach=True,
                tty=True,
                stdin_open=True,
                command="sh -c 'echo Container started!; tail -f /dev/null'",
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
    current_dir = f"/app/{project_id}/workspace"

    async def handle_ws_command(container, cmd: str, current_dir: str):
        cmd = cmd.strip()
        if not cmd:
            return "", current_dir

        # Handle cd commands
        if cmd.startswith("cd "):
            target = cmd[3:].strip()
            current_dir = os.path.normpath(os.path.join(current_dir, target))
            return f"Changed directory to {current_dir}\n", current_dir

        # Handle JSON payload commands
        if cmd.startswith("{") and cmd.endswith("}"):
            try:
                payload = json.loads(cmd)
                response = await handle_command(container, payload, current_dir)
                return response, current_dir
            except Exception as e:
                return f"Error handling command: {str(e)}", current_dir

        # Shell command fallback
        result = container.exec_run(f"bash -c 'cd {current_dir} && {cmd}'", demux=True)
        stdout, stderr = result.output
        output = ""
        if stdout:
            output += stdout.decode()
        if stderr:
            output += stderr.decode()
        return output, current_dir

    while True:
        try:
            cmd = await websocket.receive_text()
            output, current_dir = await handle_ws_command(container, cmd, current_dir)
            if output:
                await websocket.send_text(output)
        except WebSocketDisconnect:
            break


async def handle_command(container, payload, current_dir):
    target = payload["target"]
    project_payload = payload["payload"]

    if target == "frontend":
        framework = project_payload["framework"]
        name = project_payload["name"]

        if framework == "html-css":
            cmd = f"mkdir -p {current_dir}/{name} && echo '<h1>{name}</h1>' > {current_dir}/{name}/index.html"
            container.exec_run(f"bash -c '{cmd}'")
            return f"Frontend {name} (HTML+CSS) created!"
        # Add React / Next.js scaffolding later

    elif target == "backend":
        framework = project_payload["framework"]
        name = project_payload["name"]

        if framework == "fastapi":
            cmd = (
                f"mkdir -p {current_dir}/{name} && "
                f"echo 'from fastapi import FastAPI\napp = FastAPI()' > {current_dir}/{name}/main.py"
            )
            container.exec_run(f"bash -c '{cmd}'")
            return f"Backend {name} (FastAPI) created!"
        # Add Node/Express or other backend scaffolding later