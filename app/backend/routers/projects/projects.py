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

BACKEND_PACKAGES = {
    "python": [],
    "node": ["nodejs", "npm"],
    "rust": ["build-base", "curl"]
}

DATABASE_PACKAGES = {
    "postgres": ["postgres", "postgresql-client"],
    "mysql": ["mariadb", "mariadb-client"],
    "sqlite": []
}

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

    # Base packages
    apk_packages = ["curl", "bash", "ca-certificates", "gnupg"]
    

    for service in backend_services:
        apk_packages.extend(BACKEND_PACKAGES.get(service, []))

    # Add packages for databases
    for db in db:
        apk_packages.extend(DATABASE_PACKAGES.get(db, []))

    apk_packages_str = " \\\n    ".join(set(apk_packages))

    # Create directories
    dirs = ["workspace", "workspace/frontend", "workspace/backend", "workspace/database"]
    dir_commands = "\n".join([f"RUN mkdir -p /app/{project_id}/{d}" for d in dirs])

    dockerfile_content = f"""
    FROM python:3.14.0-alpine
    WORKDIR /app
    {dir_commands}

    # Install dependencies
    RUN apk update && apk add --no-cache \\
        {apk_packages_str}

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
    backend: str = Body(None, embed=True),
    frontend: str = Body(None, embed=True),
    db: str = Body(None, embed=True),
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

    image_id = await create_project_image(project_id, name, backend_services=[backend] if backend else [],
        frontend_services=[frontend] if frontend else [],
        db=[db] if db else [])

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