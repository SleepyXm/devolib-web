from helpers.structlogger import logger
from routers.projects.helpers.scanners.scanner import scan_project
from routers.projects.helpers.containerhelper import scaffold_template
from routers.projects.helpers.scanners.generalscanner import build_tree
import json
import asyncio

async def scaffold_import(container, import_url: str):
    repo_name = import_url.rstrip("/").split("/")[-1].removesuffix(".git")
    workspace = "/app/workspace"
    repo_path = f"{workspace}/{repo_name}"
    loop = asyncio.get_event_loop()

    logger.info("Cloning repo", url=import_url)
    await loop.run_in_executor(None, lambda: container.exec_run(
        f"sh -c 'cd {workspace} && git clone --depth=1 {import_url}'",
        tty=True,
        detach=False,
    ))

    logger.info("Scanning project structure", url=import_url)
    scan_result = await loop.run_in_executor(None, lambda: scan_project(container, repo_path))

    logger.info("Installing frontend dependencies", url=import_url)
    await loop.run_in_executor(None, lambda: container.exec_run(
        f"sh -c 'if [ -f {repo_path}/package.json ]; then cd {repo_path} && npm install; fi'",
        tty=True,
        detach=False,
    ))

    logger.info("Installing backend dependencies", url=import_url)
    await loop.run_in_executor(None, lambda: container.exec_run(
        f"sh -c 'if [ -f {repo_path}/requirements.txt ]; then pip install -r {repo_path}/requirements.txt; fi'",
        tty=True,
        detach=False,
    ))

    return scan_result


async def scaffold_fresh(container, project_name: str, frontend_services: list, backend_services: list, db: list, configs_map: dict):
    loop = asyncio.get_event_loop()

    for framework in frontend_services:
        cfg = configs_map.get(framework)

        if cfg and cfg.get("scaffold_command"):
            cmd = cfg["scaffold_command"].replace("{name}", project_name)
            logger.info("Scaffolding frontend", framework=framework, cmd=cmd)
            await loop.run_in_executor(None, lambda cmd=cmd: container.exec_run(
                f"sh -c 'cd /app/workspace/frontend && {cmd}'",
                tty=True,
                detach=False,
            ))

        if cfg and cfg.get("default_packages"):
            packages = " ".join(json.loads(cfg["default_packages"]))
            await loop.run_in_executor(None, lambda packages=packages: container.exec_run(
                f"sh -c 'cd /app/workspace/frontend/{project_name} && npm install {packages}'",
                tty=True,
                detach=False,
            ))

        if framework == "React":
            scaffold_template(container, "React", f"/app/workspace/frontend/{project_name}")

    for framework in backend_services:
        cfg = configs_map.get(framework)

        if framework == "FastAPI":
            scaffold_template(container, "FastAPI", "/app/workspace/backend")
            await loop.run_in_executor(None, lambda:container.exec_run(
                "sh -c 'mkdir -p /app/workspace/backend/routers'",
                tty=True,
                detach=False,
            ))

        if cfg and cfg.get("scaffold_command"):
            cmd = cfg["scaffold_command"].replace("{name}", project_name)
            logger.info("Scaffolding backend", framework=framework, cmd=cmd)
            await loop.run_in_executor(None, lambda cmd=cmd:container.exec_run(f"sh -c '{cmd}'", tty=True, detach=False))

    for framework in db:
        cfg = configs_map.get(framework)
        if cfg and cfg.get("scaffold_command"):
            cmd = cfg["scaffold_command"].replace("{name}", project_name)
            logger.info("Scaffolding database", framework=framework, cmd=cmd)
            await loop.run_in_executor(None, lambda cmd=cmd: container.exec_run(
                f"sh -c 'cd /app/workspace/database && {cmd}'",
                tty=True,
                detach=False,
            ))

    return {
        "pages": [{"route": "/", "file": "src/App.jsx"}] if "React" in frontend_services else [],
        "endpoints": [{"method": "GET", "path": "/api/health", "file": "main.py"}] if "FastAPI" in backend_services else [],
    }

            


def build_project_groups(
    container,
    project_name: str,
    frontend_services: list,
    backend_services: list,
    scan_result=None,
) -> list:
    groups = []

    if scan_result:
        if scan_result.frontend_groups:
            groups.append({
                "name": "frontend",
                "type": "folder",
                "context": "frontend",
                "filepath": (scan_result.frontend_root or "").replace("/app/workspace/", "").strip("/") or "frontend",
                "children": scan_result.frontend_groups,
            })

        if scan_result.backend_groups:
            groups.append({
                "name": "backend",
                "type": "folder",
                "context": "backend",
                "filepath": (scan_result.backend_root or "").replace("/app/workspace/", "").strip("/") or "backend",
                "children": scan_result.backend_groups,
            })
    else:
        if frontend_services:
            groups.append({
                "name": "frontend",
                "type": "folder",
                "context": "frontend",
                "filepath": "frontend",
                "children": build_tree(container, f"/app/workspace/frontend/{project_name}", "frontend"),
            })

        if backend_services:
            groups.append({
                "name": "backend",
                "type": "folder",
                "context": "backend",
                "filepath": "backend",
                "children": build_tree(container, "/app/workspace/backend", "backend"),
            })

    return groups