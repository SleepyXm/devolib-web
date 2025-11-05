import uuid
from fastapi import APIRouter, Depends, Body
from schemas import ProjectCreate
from database import database
from routers.auth.auth_utils import get_current_user
import docker
import os

router = APIRouter()

docker_client = docker.from_env()

async def create_project_image(project_id: str, project_name: str):
    """
    1. Dynamically generates a Dockerfile for the project.
    2. Builds a Docker image.
    3. Saves the image ID in the projects table.
    """
    image_tag = f"devolib_project_{project_id}"


    build_dir = f"/tmp/devolib_build_{project_id}"
    os.makedirs(build_dir, exist_ok=True)


    dockerfile_content = f"""
    FROM python:3.13-slim
    WORKDIR /app
    RUN mkdir -p /app/user_code/{project_id}
    # Optional: copy pre-existing starter code here if you want
    CMD ["sleep", "infinity"]
    """
    dockerfile_path = os.path.join(build_dir, "Dockerfile")
    with open(dockerfile_path, "w") as f:
        f.write(dockerfile_content)


    try:
        image, logs = docker_client.images.build(
            path=build_dir,
            tag=image_tag,
            rm=True
        )
        image_id = image.id
    except docker.errors.BuildError as e:
        for line in e.build_log:
            print(line.get("stream", ""))
        raise Exception(f"Docker build failed: {e}")


    update_query = """
    UPDATE projects
    SET container_id = :container_id
    WHERE project_id = :project_id
    """
    await database.execute(
        query=update_query,
        values={"container_id": image_id, "project_id": project_id}
    )

    return image_id

@router.get("/list")
async def list_projects(current_user: dict = Depends(get_current_user)):
    query = "SELECT project_id, name, status, container_id, created_at FROM projects WHERE user_id = :user_id"
    projects = await database.fetch_all(query=query, values={"user_id": current_user["id"]})
    return {"projects": projects}

@router.get("/hi")
async def hi():
    return {"message": "Projects router is working!"}

@router.post("/create")
async def create_project(
    name: str = Body(..., embed=True),
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

    image_id = await create_project_image(project_id, name)

    return {"ok": True, "project_id": project_id, "image_id": image_id, "name": name}