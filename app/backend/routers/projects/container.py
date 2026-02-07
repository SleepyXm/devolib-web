from fastapi import APIRouter, Depends, HTTPException, Body, WebSocket, WebSocketDisconnect, Query
from database import database
from database import database
from routers.auth.auth_utils import get_current_user
import docker
import os
from datetime import datetime
import json
from .services import send_service_status, send_error, process_command

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
                network="web",
                detach=True,
                tty=True,
                stdin_open=True,
                command="sh -c 'echo Container started!; tail -f /dev/null'",
            )
        except docker.errors.ImageNotFound:
            raise HTTPException(status_code=404, detail="Docker image not found")
    
    await database.execute(
        "UPDATE projects SET last_online = NOW() WHERE project_id = :project_id",
        {"project_id": project_id}
    )
    
    return {"ok": True, "container_id": container.id, "status": container.status}



# Main WebSocket handler
@router.websocket("/ws/{project_id}")
async def websocket_terminal(websocket: WebSocket, project_id: str, access_token: str = Query(None)):

    if not access_token:
        await websocket.close(code=1008, reason="Access token required")
        return 
    
    query = "SELECT * FROM projects WHERE project_id = :project_id AND access_token = :access_token"
    project = await database.fetch_one(query=query, values={"project_id": project_id, "access_token": access_token})
    
    if not project:
        await websocket.close(code=1008, reason="Invalid access token or project not found")
        return

    project_name = project["name"]

 
    await websocket.accept()
    
    # Get container
    container_name = f"devolib_project_{project_id}"
    try:
        container = docker_client.containers.get(container_name)
    except docker.errors.NotFound:
        await send_error(websocket, "Container not found")
        await websocket.close(code=1000)
        return
    
    # Send connection message for confirmation
    await websocket.send_text(f"User connected at {datetime.utcnow().isoformat()}!\n")
    await send_service_status(websocket, {"container": True})
    
    current_dir = "/app/workspace"
    
    # Main command loop
    try:
        while True:
            cmd = await websocket.receive_text()
            print(f"Received command: {cmd}")
            
            output, current_dir = await process_command(container, cmd, current_dir, websocket, project_id, project_name)
            
            if output:
                await websocket.send_text(output)
                
    except WebSocketDisconnect:
        await send_service_status(websocket, {"container": False})
        print(f"WebSocket disconnected for project {project_id}")
        
    except Exception as e:
        await send_error(websocket, f"Connection error: {str(e)}")
        await send_service_status(websocket, {"container": False})
        print(f"WebSocket error for project {project_id}: {e}")
            



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
    