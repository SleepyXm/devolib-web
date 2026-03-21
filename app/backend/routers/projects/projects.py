import uuid
from fastapi import APIRouter, Depends, Body, HTTPException, Request
from database import database
from routers.auth.auth_utils import get_current_user
from .images import create_project_container, delete_project_container
import secrets
import json
from helpers.limiter import limiter
from helpers.queries.projectquery import list_projects_query, create_project_query

router = APIRouter()

@router.get("/list")
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




@router.post("/create")
@limiter.limit("3/minute")
async def create_project(
    request: Request,
    name: str = Body(..., embed=True),
    backend: str = Body(None, embed=True),
    frontend: str = Body(None, embed=True),
    db: str = Body(None, embed=True),
    current_user: dict = Depends(get_current_user)
):
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

    default_pages = []
    default_endpoints = []
    default_components = []
    default_utils = []

    

    if frontend == "React":
        default_pages.append({
            "route": "/",
            "file": "src/App.jsx"
        })

        default_utils.append({
            "name": "api",
            "type": "wrapper",  # types: wrappers, hooks, helper, middleware
            "category": "http", # categories: http, validation, auth, payment
            "filepath": "src/components/handlers/api.js",
            "compatibility": "React"
        })
        default_utils.append({
            "name": "auth",
            "type": "hook",
            "category": "auth", 
            "filepath": "src/components/handlers/auth.js",
            "compatibility": "React"
        })
        default_utils.append({
            "name": "requests",
            "type": "wrapper",
            "category": "http",
            "filepath": "src/components/handlers/requests.js",
            "compatibility": "React"
        })

        
    elif frontend == "Next.js":
        default_pages.append({
            "route": "/",
            "file": "src/app/page.tsx"
        })

    if backend == "Express":
        default_endpoints.append({
            "method": "GET",
            "path": "/api/health",
            "file": "routes/main.js"
        })

    elif backend == "FastAPI":
        default_endpoints.append({
            "method": "GET",
            "path": "/api/health",
            "file": "main.py"
        })

    print(f"frontend: '{frontend}', backend: '{backend}'")

    await database.execute(
        """
        INSERT INTO project_metadata (project_id, envs, db_schema, pages, endpoints, components, utils)
        VALUES (:project_id, CAST(:envs AS jsonb), CAST(:db_schema AS jsonb), CAST(:pages AS jsonb), CAST(:endpoints AS jsonb), CAST(:components AS jsonb), CAST(:utils AS jsonb))
        """,
        {
            "project_id": project_id,
            "envs": json.dumps(default_envs),
            "db_schema": json.dumps({}),
            "pages": json.dumps(default_pages),
            "endpoints": json.dumps(default_endpoints),
            "components": json.dumps(default_components),
            "utils": json.dumps(default_utils),
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
    SELECT envs, db_schema, endpoints, pages, components, utils, updated_at
    FROM project_metadata
    WHERE project_id = :project_id
    """
    metadata = await database.fetch_one(query, {"project_id": project_id})
    
    if not metadata:
        # Create default metadata
        await database.execute(
            """
            INSERT INTO project_metadata (project_id, envs, db_schema, pages, endpoints, components, utils)
            VALUES (:project_id, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb)
            """,
            {"project_id": project_id}
        )
        return {
            "envs": [],
            "db_schema": {},
            "pages": [],
            "endpoints": [],
            "components": [],
            "utils": [],
            "updated_at": None
        }
    
    return {
        "envs": json.loads(metadata["envs"]) if isinstance(metadata["envs"], str) else (metadata["envs"] or []),
        "db_schema": json.loads(metadata["db_schema"]) if isinstance(metadata["db_schema"], str) else (metadata["db_schema"] or {}),
        "pages": json.loads(metadata["pages"]) if isinstance(metadata["pages"], str) else (metadata["pages"] or []),
        "endpoints": json.loads(metadata["endpoints"]) if isinstance(metadata["endpoints"], str) else (metadata["endpoints"] or []),
        "components": json.loads(metadata["components"]) if isinstance(metadata["components"], str) else (metadata["components"] or []),
        "utils": json.loads(metadata["utils"]) if isinstance(metadata["utils"], str) else (metadata["utils"] or []),
        "updated_at": metadata["updated_at"]
    }

@router.patch("/metadata/{project_id}")
async def update_metadata(project_id: str, body: dict, current_user: dict = Depends(get_current_user)):

    project = await database.fetch_one(
        "SELECT project_id FROM projects WHERE project_id = :project_id AND user_id = :user_id",
        {"project_id": project_id, "user_id": current_user["id"]}
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or not owned by user")

    allowed = {"envs", "db_schema", "pages", "endpoints"}
    updates = {k: v for k, v in body.items() if k in allowed}
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    await database.execute(
        f"UPDATE project_metadata SET {set_clause}, updated_at = NOW() WHERE project_id = :project_id",
        {**{k: json.dumps(v) for k, v in updates.items()}, "project_id": project_id}
    )

    return {"ok": True}