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
        p.last_online,
        s.name as service_name,
        s.framework as service_framework
    FROM projects p
    LEFT JOIN project_services ps ON p.project_id = ps.project_id
    LEFT JOIN services s ON s.id = ps.service_id
    WHERE p.user_id = :user_id
    ORDER BY p.last_online DESC NULLS LAST, p.created_at DESC
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
    
    default_envs = [
        {"key": "FRONTEND_URL", "value": f"{name}.localhost", "is_secret": False},
        {"key": "BACKEND_URL", "value": "http://localhost:8000", "is_secret": False},
        {"key": "DATABASE_URL", "value": "postgresql://postgres@localhost:5432/myapp", "is_secret": True},
    ]

    default_endpoints = []
    if frontend:
        default_endpoints.append({"path": "/", "type": "frontend"})
    if backend:
        default_endpoints.extend([
            {"method": "GET", "path": "/api/health", "type": "backend"},
        ])

    await database.execute(
        """
        INSERT INTO project_metadata (project_id, envs, db_schema, endpoints)
        VALUES (:project_id, CAST(:envs AS jsonb), CAST(:db_schema AS jsonb), CAST(:endpoints AS jsonb))
        """,
        {
            "project_id": project_id,
            "envs": json.dumps(default_envs),
            "db_schema": json.dumps({}),
            "endpoints": json.dumps(default_endpoints)
        }
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
    SELECT project_id FROM projects
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

@router.get("/metadata/{project_id}")
async def get_metadata(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    # Verify ownership
    select_query = """
    SELECT project_id FROM projects 
    WHERE project_id = :project_id AND user_id = :user_id
    """
    project = await database.fetch_one(
        select_query,
        {"project_id": project_id, "user_id": current_user["id"]}
    )
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or not owned by user")
    
    # Get metadata
    query = """
    SELECT envs, db_schema, endpoints, updated_at
    FROM project_metadata
    WHERE project_id = :project_id
    """
    metadata = await database.fetch_one(query, {"project_id": project_id})
    
    if not metadata:
        # Create default metadata
        await database.execute(
            """
            INSERT INTO project_metadata (project_id, envs, db_schema, endpoints)
            VALUES (:project_id, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb)
            """,
            {"project_id": project_id}
        )
        return {
            "envs": [],
            "db_schema": {},
            "endpoints": [],
            "updated_at": None
        }
    
    return {
        "envs": json.loads(metadata["envs"]) if isinstance(metadata["envs"], str) else metadata["envs"],
        "db_schema": json.loads(metadata["db_schema"]) if isinstance(metadata["db_schema"], str) else metadata["db_schema"],
        "endpoints": json.loads(metadata["endpoints"]) if isinstance(metadata["endpoints"], str) else metadata["endpoints"],
        "updated_at": metadata["updated_at"]
    }