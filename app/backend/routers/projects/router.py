import uuid,secrets, json, httpx, asyncio, docker
from fastapi import APIRouter, Depends, Body, HTTPException, Request, WebSocket, WebSocketDisconnect, Query
from database import database
from routers.auth.auth_utils import get_current_user
from utils.crypto import decrypt
from .container import create_project_container, delete_project_container, start_container, stop_running_container, get_container
from helpers.limiter import limiter
from helpers.queries.projectquery import list_projects_query
from helpers.structlogger import logger
from helpers.stopper import stop_container
from .operations import get_project, get_or_create_metadata, update_project_metadata, project_list, insert_project_services, update_project_roots, insert_project_metadata, rollback_project, create_project_record
from .containers.terminal import run_terminal_session
from utils.crypto import hash_token

project_router = APIRouter()

@project_router.get("/list")
async def list_projects(current_user: dict = Depends(get_current_user)):
    rows = await database.fetch_all(query=list_projects_query(), values={"user_id": current_user["id"]})
    return {"projects": project_list(rows)}




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

    await create_project_record(project_id, current_user["id"], name, access_token)
    await insert_project_services(project_id, [s for s in [backend, frontend, db] if s])

    try:
        container_info = await create_project_container(
            project_id, name,
            backend_services=[backend] if backend else [],
            frontend_services=[frontend] if frontend else [],
            db=[db] if db else [],
            import_url=import_url,
        )
    except Exception as e:
        logger.error("Container creation failed, rolling back", project_id=project_id, error=str(e))
        await rollback_project(project_id)
        raise HTTPException(status_code=500, detail="Failed to create project container")

    if container_info.get("detected_frameworks"):
        await insert_project_services(project_id, container_info["detected_frameworks"])

    await update_project_roots(project_id, container_info)
    await insert_project_metadata(project_id, name, container_info)

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

    project = await get_project(project_id, access_token=access_token)
    if not project:
        await websocket.close(code=1008, reason="Invalid access token or project not found")
        return

    try:
        container = get_container(project_id)
    except docker.errors.NotFound:
        await websocket.send_text("Container not found\n")
        await websocket.close(code=1000)
        return

    await websocket.accept()
    await run_terminal_session(websocket, container, project_id, project["name"])
            



@project_router.post("/stop/{project_id}")
async def stop_project(project_id: str, current_user: dict = Depends(get_current_user)):
    await get_project(project_id, current_user["id"])
    try:
        container = await stop_container(project_id)
        return {"ok": True, "container_id": container.id, "status": "stopped"}
    except docker.errors.NotFound:
        raise HTTPException(status_code=404, detail="Container not found")