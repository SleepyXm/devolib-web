import uuid
from fastapi import FastAPI, HTTPException, APIRouter, Depends, Body
from schemas import ProjectCreate
from database import database
from routers.auth.auth_utils import get_current_user

router = APIRouter()

@router.post("/create")
async def create_project(
    name: str = Body(..., embed=True),
    current_user: dict = Depends(get_current_user)
):
    project_id = str(uuid.uuid4())

    query = """
    INSERT INTO projects (project_id, user_id, name, status, created_at)
    VALUES (:project_id, :user_id, :name, 'created', NOW())
    """

    await database.execute(
        query=query,
        values={
            "project_id": project_id,
            "user_id": current_user["id"],
            "name": name,
        },
    )

    return {"ok": True, "project_id": project_id, "name": name}