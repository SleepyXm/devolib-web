import json
from dataclasses import dataclass, field
from routers.projects.helpers.scanners.frontendscanner import  detect_nextjs, detect_react, detect_vue, detect_vanilla, scan_nextjs_pages, scan_react_pages, scan_vanilla_pages, find_frontend_root
from routers.projects.helpers.scanners.backendscanner import detect_fastapi, detect_flask, detect_express, detect_rust_actix, find_backend_root, scan_fastapi_endpoints, scan_express_endpoints
from routers.projects.helpers.scanners.databasescanner import detect_db
from routers.projects.helpers.scanners.generalscanner import build_tree

@dataclass
class ScanResult:
    frontend_framework: str | None = None
    backend_framework: str | None = None
    db_framework: str | None = None
    backend_root: str | None = None
    frontend_root: str | None = None
    pages: list = field(default_factory=list)
    endpoints: list = field(default_factory=list)
    frontend_groups: list = field(default_factory=list)
    backend_groups: list = field(default_factory=list)

 
 
def scan_project(container, repo_path: str) -> ScanResult:
    """
    Scan a cloned repo inside a container and return a ScanResult
    with detected frameworks and inferred pages/endpoints/groups.
    """
    result = ScanResult()
 
    # ── Frontend
    if detect_nextjs(container, repo_path):
        result.frontend_framework = "Next.js"
        result.frontend_root = find_frontend_root(container, repo_path, "Next.js")
        result.pages = scan_nextjs_pages(container, repo_path)
        result.frontend_groups = build_tree(container, result.frontend_root or repo_path, "frontend")

    elif detect_react(container, repo_path):
        result.frontend_framework = "React"
        result.pages = scan_react_pages(container, repo_path)
        result.frontend_groups = build_tree(container, repo_path, "frontend")
 
    elif detect_vue(container, repo_path):
        result.frontend_framework = "Vue"
 
    elif detect_vanilla(container, repo_path):
        result.frontend_framework = "Vanilla"
        result.pages = scan_vanilla_pages(container, repo_path)
 
    # ── Backend
    if detect_fastapi(container, repo_path):
        result.backend_framework = "FastAPI"
        result.backend_root = find_backend_root(container, repo_path, "FastAPI")
        result.endpoints = scan_fastapi_endpoints(container, repo_path)
        result.backend_groups = build_tree(container, result.backend_root or repo_path, "backend")

    elif detect_flask(container, repo_path):
        result.backend_framework = "Flask"
        result.backend_groups = build_tree(container, repo_path, "backend")

    elif detect_express(container, repo_path):
        result.backend_framework = "Express"
        result.endpoints = scan_express_endpoints(container, repo_path)
        result.backend_groups = build_tree(container, repo_path, "backend")
 
    elif detect_rust_actix(container, repo_path):
        result.backend_framework = "Actix"
        result.backend_groups = build_tree(container, repo_path, "backend")

 
    # ── Database
    result.db_framework = detect_db(container, repo_path) or "PostgreSQL"
 
    return result
 