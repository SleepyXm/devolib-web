
from database import database
from fastapi import HTTPException
import json, uuid
from helpers.queries.projectquery import create_project_query
from utils.crypto import hash_token


ALLOWED_METADATA_FIELDS = {"envs", "db_schema", "pages", "endpoints", "groups"}


# -------------- Projects ---------------------- #

async def get_project(project_id: str, user_id: str = None, access_token: str = None):
    if user_id:
        query = "SELECT * FROM projects WHERE project_id = :project_id AND user_id = :user_id"
        values = {"project_id": project_id, "user_id": user_id}
    elif access_token:
        query = "SELECT * FROM projects WHERE project_id = :project_id AND access_token = :access_token"
        values = {"project_id": project_id, "access_token": access_token}
    else:
        raise ValueError("Must provide either user_id or access_token")

    project = await database.fetch_one(query=query, values=values)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or not owned by user")
    return project




def project_list(rows) -> list[dict]:
    projects: dict[str, dict] = {}

    for row in rows:
        project_id = row["project_id"]

        if project_id not in projects:
            projects[project_id] = {
                "project_id": project_id,
                "name": row["name"],
                "status": row["status"],
                "container_id": row["container_id"],
                "created_at": row["created_at"],
                "last_online": row["last_online"],
                "services": [],
            }

        if row["service_name"] is not None:
            projects[project_id]["services"].append({
                "name": row["service_name"],
                "framework": row["service_framework"],
            })

    return list(projects.values())


async def create_project_record(project_id: str, user_id: str, name: str, access_token: str):
    await database.execute(
        query=create_project_query(),
        values={
            "project_id": project_id,
            "user_id": user_id,
            "name": name,
            "access_token": hash_token(access_token),
        }
    )


# ---------------------- Metadata ---------------------- #
async def get_or_create_metadata(project_id: str) -> dict:
    metadata = await database.fetch_one(
        "SELECT envs, db_schema, endpoints, pages, groups, updated_at FROM project_metadata WHERE project_id = :project_id",
        {"project_id": project_id}
    )

    if not metadata:
        await database.execute(
            """
            INSERT INTO project_metadata (project_id, envs, db_schema, pages, endpoints, groups)
            VALUES (:project_id, '[]'::jsonb, '{}'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb)
            """,
            {"project_id": project_id}
        )
        return {"envs": [], "db_schema": {}, "pages": [], "endpoints": [], "groups": [], "updated_at": None}

    return {
        "envs": json.loads(metadata["envs"]) if isinstance(metadata["envs"], str) else (metadata["envs"] or []),
        "db_schema": json.loads(metadata["db_schema"]) if isinstance(metadata["db_schema"], str) else (metadata["db_schema"] or {}),
        "pages": json.loads(metadata["pages"]) if isinstance(metadata["pages"], str) else (metadata["pages"] or []),
        "endpoints": json.loads(metadata["endpoints"]) if isinstance(metadata["endpoints"], str) else (metadata["endpoints"] or []),
        "groups": json.loads(metadata["groups"]) if isinstance(metadata["groups"], str) else (metadata["groups"] or []),
        "updated_at": metadata["updated_at"]
    }



async def insert_project_metadata(project_id: str, name: str, container_info: dict):
    await database.execute(
        """
        INSERT INTO project_metadata (project_id, envs, db_schema, pages, endpoints, groups)
        VALUES (:project_id, CAST(:envs AS jsonb), CAST(:db_schema AS jsonb), CAST(:pages AS jsonb), CAST(:endpoints AS jsonb), CAST(:groups AS jsonb))
        """,
        {
            "project_id": project_id,
            "envs": json.dumps(get_default_envs(name)),
            "db_schema": json.dumps({}),
            "pages": json.dumps(container_info["pages"]),
            "endpoints": json.dumps(container_info["endpoints"]),
            "groups": json.dumps(container_info["groups"]),
        }
    )

async def update_project_metadata(project_id: str, user_id: str, body: dict) -> None:
    await get_project(project_id, user_id)  # ownership + existence check

    updates = {k: v for k, v in body.items() if k in ALLOWED_METADATA_FIELDS}
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    await database.execute(
        f"UPDATE project_metadata SET {set_clause}, updated_at = NOW() WHERE project_id = :project_id",
        {**{k: json.dumps(v) for k, v in updates.items()}, "project_id": project_id}
    )



def get_default_envs(name: str) -> list[dict]:
    return [
        {"key": "FRONTEND_URL", "value": f"{name}.localhost", "is_secret": False},
        {"key": "BACKEND_URL", "value": "http://localhost:8000", "is_secret": False},
        {"key": "DATABASE_URL", "value": "postgresql://postgres@localhost:5432/myapp", "is_secret": True},
    ]


async def update_project_roots(project_id: str, container_info: dict):
    await database.execute(
        "UPDATE projects SET frontend_root = :fr, backend_root = :br, db_root = :dr WHERE project_id = :id",
        values={
            "fr": container_info["frontend_root"],
            "br": container_info["backend_root"],
            "dr": container_info["db_root"],
            "id": project_id
        }
    )


# ---------------- Services ---------------------- #

async def insert_project_services(project_id: str, frameworks: list[str]):
    if not frameworks:
        return
    services = await database.fetch_all(
        "SELECT id FROM services WHERE framework = ANY(:frameworks)",
        values={"frameworks": frameworks}
    )
    for service in services:
        await database.execute(
            "INSERT INTO project_services (id, project_id, service_id, created_at) VALUES (:id, :project_id, :service_id, NOW())",
            values={"id": str(uuid.uuid4()), "project_id": project_id, "service_id": service["id"]},
        )



# ---------------- Failure Cases ---------------------- #

async def rollback_project(project_id: str):
    await database.execute("DELETE FROM project_services WHERE project_id = :id", {"id": project_id})
    await database.execute("DELETE FROM projects WHERE project_id = :id", {"id": project_id})