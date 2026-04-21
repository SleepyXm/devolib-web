import uuid,secrets, json, httpx, asyncio, docker
from fastapi import APIRouter, Depends, Body, HTTPException, Request, WebSocket, WebSocketDisconnect, Query
from database import database
from routers.auth.auth_utils import get_current_user, decrypt
from .container import create_project_container, delete_project_container, start_container, stop_running_container
from helpers.limiter import limiter
from helpers.queries.projectquery import list_projects_query, create_project_query
from helpers.servicestates import send_service_status
from helpers.structlogger import logger
from helpers.stopper import stop_container
from helpers.dockerclient import docker_client
from datetime import datetime
from .services import process_command, tail_logd
from .operations import get_project, get_or_create_metadata, update_project_metadata

project_router = APIRouter()

@project_router.get("/list")
async def list_projects(current_user: dict = Depends(get_current_user)):
    # Aggregate query, removing N+1 query
    rows = await database.fetch_all(query=list_projects_query(), values={"user_id": current_user["id"]})
    
    # Aggregate services by project
    projects_dict = {}
    for row in rows:
        project_id = row["project_id"]
        
        if project_id not in projects_dict:
            projects_dict[project_id] = {
                "project_id": project_id,
                "name": row["name"],
                "status": row["status"],
                "container_id": row["container_id"],
                "created_at": row["created_at"],
                "services": [],
                "last_online": row["last_online"]
            }
        
        # Add service if it exists for project
        if row["service_name"] is not None:
            projects_dict[project_id]["services"].append({
                "name": row["service_name"],
                "framework": row["service_framework"]
            })
    
    return {"projects": list(projects_dict.values())}




@project_router.get("/repos")
async def get_github_repos(current_user: dict = Depends(get_current_user)):
    user = await database.fetch_one(
        "SELECT github_access_token FROM users WHERE id = :id",
        values={"id": current_user["id"]}  # fixed
    )

    if not user or not user["github_access_token"]:
        raise HTTPException(status_code=400, detail="No GitHub account connected")

    token = decrypt(user["github_access_token"])

    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.github.com/user/repos",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json"
            },
            params={
                "per_page": 100,
                "sort": "updated",
                "affiliation": "owner"
            }
        )

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="Failed to fetch repos from GitHub")

    repos = response.json()

    return {
        "projects": [  # wrapped to match frontend
            {
                "id": r["id"],
                "name": r["name"],
                "full_name": r["full_name"],
                "private": r["private"],
                "url": r["html_url"],
                "default_branch": r["default_branch"],
                "updated_at": r["updated_at"],
            }
            for r in repos
        ]
    }


@project_router.post("/create")
@limiter.limit("10/minute")
async def create_project(
    request: Request,
    name: str = Body(..., embed=True),
    backend: str = Body(None, embed=True),
    frontend: str = Body(None, embed=True),
    db: str = Body(None, embed=True),
    current_user: dict = Depends(get_current_user),
    import_url: str = Body(None, embed=True),
):
    if not name or not name.strip():
        raise HTTPException(status_code=422, detail="Project name is required")

    project_id = str(uuid.uuid4())
    access_token = secrets.token_urlsafe(32)

    await database.execute(
        query=create_project_query(),
        values={
            "project_id": project_id,
            "user_id": current_user["id"],
            "name": name,
            "access_token": access_token,
        },
    )

    service_frameworks = [s for s in [backend, frontend, db] if s]
    if service_frameworks:
        services = await database.fetch_all(
            "SELECT id FROM services WHERE framework = ANY(:frameworks)",
            values={"frameworks": service_frameworks}
        )
        for service in services:
            await database.execute(
                "INSERT INTO project_services (id, project_id, service_id, created_at) VALUES (:id, :project_id, :service_id, NOW())",
                values={"id": str(uuid.uuid4()), "project_id": project_id, "service_id": service["id"]},
            )

    default_envs = [
        {"key": "FRONTEND_URL", "value": f"{name}.localhost", "is_secret": False},
        {"key": "BACKEND_URL", "value": "http://localhost:8000", "is_secret": False},
        {"key": "DATABASE_URL", "value": "postgresql://postgres@localhost:5432/myapp", "is_secret": True},
    ]

    try:
        container_info = await create_project_container(
            project_id,
            name,
            backend_services=[backend] if backend else [],
            frontend_services=[frontend] if frontend else [],
            db=[db] if db else [],
            import_url=import_url,
        )
    except Exception as e:
        logger.error("Container creation failed, rolling back project", project_id=project_id, error=str(e))
        await database.execute("DELETE FROM project_services WHERE project_id = :id", {"id": project_id})
        await database.execute("DELETE FROM projects WHERE project_id = :id", {"id": project_id})
        raise HTTPException(status_code=500, detail="Failed to create project container")
    
    if container_info.get("detected_frameworks"):
        detected_services = await database.fetch_all(
            "SELECT id FROM services WHERE framework = ANY(:frameworks)",
            values={"frameworks": container_info["detected_frameworks"]}
        )
        for service in detected_services:
            await database.execute(
                "INSERT INTO project_services (id, project_id, service_id, created_at) VALUES (:id, :project_id, :service_id, NOW())",
                values={"id": str(uuid.uuid4()), "project_id": project_id, "service_id": service["id"]},
            )

    await database.execute(
        "UPDATE projects SET frontend_root = :fr, backend_root = :br, db_root = :dr WHERE project_id = :id",
        values={"fr": container_info["frontend_root"], "br": container_info["backend_root"], "dr": container_info["db_root"], "id": project_id}
    )
    print(f"[DEBUG] Setting frontend_root = {container_info['frontend_root']}")
    print(f"[DEBUG] Setting backend_root = {container_info['backend_root']}")
    print(f"[DEBUG] Setting db_root = {container_info['db_root']}")


    await database.execute(
        """
        INSERT INTO project_metadata (project_id, envs, db_schema, pages, endpoints, groups)
        VALUES (:project_id, CAST(:envs AS jsonb), CAST(:db_schema AS jsonb), CAST(:pages AS jsonb), CAST(:endpoints AS jsonb), CAST(:groups AS jsonb))
        """,
        {
            "project_id": project_id,
            "envs": json.dumps(default_envs),
            "db_schema": json.dumps({}),
            "pages": json.dumps(container_info["pages"]),
            "endpoints": json.dumps(container_info["endpoints"]),
            "groups": json.dumps(container_info["groups"]),
        }
    )

    logger.info("CONTAINER GROUPS", groups=container_info["groups"])

    return {"ok": True, "project_id": project_id, "container_id": container_info["container_id"], "name": name, "access_token": access_token}




@project_router.get("/{project_id}")
async def get_project_info(project_id: str, current_user: dict = Depends(get_current_user)):
    project = dict(await get_project(project_id, current_user["id"]))
    return {
        **project,
        "roots": {
            "frontend_root": project.get("frontend_root"),
            "backend_root": project.get("backend_root"),
            "db_root": project.get("db_root"),
        }
    }


@project_router.delete("/delete")
async def delete_project(project_id: str = Body(..., embed=True), current_user: dict = Depends(get_current_user)):
    await get_project(project_id, current_user["id"])
    await delete_project_container(project_id)
    await database.execute("DELETE FROM projects WHERE project_id = :project_id", {"project_id": project_id})
    return {"ok": True, "project_id": project_id, "deleted": True}



@project_router.get("/metadata/{project_id}")
async def get_metadata(project_id: str, current_user: dict = Depends(get_current_user)):
    await get_project(project_id, current_user["id"])
    return await get_or_create_metadata(project_id)


@project_router.patch("/metadata/{project_id}")
async def patch_metadata(project_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    await update_project_metadata(project_id, current_user["id"], body)
    return {"ok": True}



@project_router.post("/start/{project_id}")
async def start_project(project_id: str, current_user: dict = Depends(get_current_user)):
    project = await get_project(project_id, current_user["id"])
    if project["status"] == "running":
        raise HTTPException(status_code=400, detail="Project is already running")

    container = await start_container(project_id)
    return {"ok": True, "container_id": container.id, "status": container.status}



# Main WebSocket handler
@project_router.websocket("/ws/{project_id}")
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

    container_name = f"devolib_project_{project_id}"
    try:
        container = docker_client.containers.get(container_name)
    except docker.errors.NotFound:
        await websocket.send_text("Container not found\n")
        await websocket.close(code=1000)
        return

    send_queue = asyncio.Queue()

    async def sender():
        while True:
            msg = await send_queue.get()
            if msg is None:
                break
            try:
                await websocket.send_text(msg)
            except Exception as e:
                logger.warning("websocket send failed", error=str(e))

    sender_task = asyncio.create_task(sender())
    logd_task = asyncio.create_task(tail_logd(container, send_queue))

    await send_queue.put(f"User connected at {datetime.utcnow().isoformat()}!\n")
    await send_service_status(send_queue, {"container": True})

    current_dir = "/app/workspace"

    try:
        while True:
            cmd = await websocket.receive_text()
            print(f"Received command: {cmd}")

            output, current_dir = await process_command(container, cmd, current_dir, send_queue, project_id, project_name)

            if output:
                await send_queue.put(output)

    except WebSocketDisconnect:
        print(f"WebSocket disconnected for project {project_id}")

    except Exception as e:
        print(f"WebSocket error for project {project_id}: {e}")
        await send_queue.put(f"Connection error: {str(e)}\n")

    finally:
        logd_task.cancel()
        await send_queue.put(None)  # shut down sender
        await sender_task
            



@project_router.post("/stop/{project_id}")
async def stop_project(project_id: str, current_user: dict = Depends(get_current_user)):
    await get_project(project_id, current_user["id"])
    try:
        container = await stop_container(project_id)
        return {"ok": True, "container_id": container.id, "status": "stopped"}
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail="Container not found")