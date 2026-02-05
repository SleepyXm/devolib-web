import uuid
from fastapi import APIRouter, Depends, Body, HTTPException
from database import database
from routers.auth.auth_utils import get_current_user
from .images import create_project_container, delete_project_container
import docker
import secrets
import json

router = APIRouter()

docker_client = docker.from_env()

@router.get("/list")
async def list_projects(current_user: dict = Depends(get_current_user)):
    # Aggregate query, removing N+1 query
    query = """
    SELECT 
        p.project_id, 
        p.name, 
        p.status, 
        p.container_id, 
        p.created_at,
        s.name as service_name,
        s.framework as service_framework
    FROM projects p
    LEFT JOIN project_services ps ON p.project_id = ps.project_id
    LEFT JOIN services s ON s.id = ps.service_id
    WHERE p.user_id = :user_id
    ORDER BY p.project_id
    """
    rows = await database.fetch_all(query=query, values={"user_id": current_user["id"]})
    
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
                "services": []
            }
        
        # Add service if it exists for project
        if row["service_name"] is not None:
            projects_dict[project_id]["services"].append({
                "name": row["service_name"],
                "framework": row["service_framework"]
            })
    
    return {"projects": list(projects_dict.values())}




@router.post("/create")
async def create_project(
    name: str = Body(..., embed=True),
    backend: str = Body(None, embed=True),
    frontend: str = Body(None, embed=True),
    db: str = Body(None, embed=True),
    current_user: dict = Depends(get_current_user)
):
    project_id = str(uuid.uuid4())
    access_token = secrets.token_urlsafe(32)
    
    # Insert project with access token
    insert_query = """
    INSERT INTO projects (project_id, user_id, name, status, access_token, created_at)
    VALUES (:project_id, :user_id, :name, 'created', :access_token, NOW())
    """
    await database.execute(
        query=insert_query,
        values={
            "project_id": project_id,
            "user_id": current_user["id"],
            "name": name,
            "access_token": access_token,
        },
    )
    
    # Insert into project_services junction table
    service_frameworks = [s for s in [backend, frontend, db] if s]
    
    if service_frameworks:
        services_query = """
        SELECT id FROM services WHERE framework = ANY(:frameworks)
        """
        services = await database.fetch_all(
            query=services_query,
            values={"frameworks": service_frameworks}
        )
        print(f"Found {len(services)} services: {services}")
        for service in services:
            await database.execute(
                query="""
                INSERT INTO project_services (id, project_id, service_id, created_at)
                VALUES (:id, :project_id, :service_id, NOW())
                """,
                values={
                    "id": str(uuid.uuid4()),
                    "project_id": project_id,
                    "service_id": service["id"],
                },
            )
    container_info = await create_project_container(
        project_id, 
        name, 
        backend_services=[backend] if backend else [],
        frontend_services=[frontend] if frontend else [],
        db=[db] if db else []
    )
    
    return {"ok": True, "project_id": project_id, "container_id": container_info["container_id"], "name": name, "access_token": access_token}


@router.get("/{project_id}")
async def get_project(project_id: str, current_user: dict = Depends(get_current_user)):
    query = "SELECT project_id, name, access_token FROM projects WHERE project_id = :project_id AND user_id = :user_id"
    project = await database.fetch_one(query=query, values={"project_id": project_id, "user_id": current_user["id"]})
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return dict(project)

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


    await delete_project_container(project_id)


    delete_query = "DELETE FROM projects WHERE project_id = :project_id"
    await database.execute(query=delete_query, values={"project_id": project_id})

    return {"ok": True, "project_id": project_id, "deleted": True}