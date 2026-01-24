import uuid
from fastapi import APIRouter, Depends, Body, HTTPException
from database import database
from routers.auth.auth_utils import get_current_user
from .images import create_project_image, delete_project_image
import docker
import json

router = APIRouter()

docker_client = docker.from_env()


@router.get("/list")
async def list_projects(current_user: dict = Depends(get_current_user)):
    query = "SELECT project_id, name, status, container_id, created_at FROM projects WHERE user_id = :user_id"
    projects = await database.fetch_all(query=query, values={"user_id": current_user["id"]})
    return {"projects": projects}


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