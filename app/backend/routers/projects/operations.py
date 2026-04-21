
from database import database
from fastapi import HTTPException
import json


ALLOWED_METADATA_FIELDS = {"envs", "db_schema", "pages", "endpoints", "groups"}

async def get_project(project_id: str, user_id: str):
    project = await database.fetch_one(
        "SELECT * FROM projects WHERE project_id = :project_id AND user_id = :user_id",
        {"project_id": project_id, "user_id": user_id}
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or not owned by user")
    return project


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