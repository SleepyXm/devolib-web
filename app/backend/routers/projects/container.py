from fastapi import APIRouter, Depends, HTTPException, Body, WebSocket, WebSocketDisconnect
from database import database
from database import database
from routers.auth.auth_utils import get_current_user
import docker
import os
from datetime import datetime
import json

router = APIRouter()
docker_client = docker.from_env()

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