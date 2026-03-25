import json
from dataclasses import dataclass, field
from routers.projects.helpers.scanners.frontendscanner import  _detect_nextjs, _detect_react, _detect_vue, _detect_vanilla, _scan_nextjs_pages, _scan_react_pages, _scan_vanilla_pages
from routers.projects.helpers.scanners.backendscanner import _detect_fastapi, _detect_flask, _detect_express, _detect_rust_actix, _find_backend_root, _scan_fastapi_endpoints, _scan_express_endpoints
from routers.projects.helpers.scanners.databasescanner import _detect_db
from routers.projects.helpers.scanners.generalscanner import _scan_groups
 
 
@dataclass
class ScanResult:
    frontend_framework: str | None = None
    backend_framework: str | None = None
    db_framework: str | None = None
    backend_root: str | None = None
    frontend_root: str | None = None
    pages: list = field(default_factory=list)
    endpoints: list = field(default_factory=list)
    groups: list = field(default_factory=list)

 
 
def scan_project(container, repo_path: str) -> ScanResult:
    """
    Scan a cloned repo inside a container and return a ScanResult
    with detected frameworks and inferred pages/endpoints/groups.
    """
    result = ScanResult()
 
    # ── Frontend
    if _detect_nextjs(container, repo_path):
        result.frontend_framework = "Next.js"
        result.pages = _scan_nextjs_pages(container, repo_path)
        result.groups = _scan_groups(container, repo_path, "frontend")
 
    elif _detect_react(container, repo_path):
        result.frontend_framework = "React"
        result.pages = _scan_react_pages(container, repo_path)
        result.groups = _scan_groups(container, repo_path, "React")
 
    elif _detect_vue(container, repo_path):
        result.frontend_framework = "Vue"
 
    elif _detect_vanilla(container, repo_path):
        result.frontend_framework = "Vanilla"
        result.pages = _scan_vanilla_pages(container, repo_path)
 
    # ── Backend
    if _detect_fastapi(container, repo_path):
        result.backend_framework = "FastAPI"
        result.backend_root = _find_backend_root(container, repo_path, "FastAPI")
        result.endpoints = _scan_fastapi_endpoints(container, repo_path)


    elif _detect_flask(container, repo_path):
        result.backend_framework = "Flask"
 
    elif _detect_express(container, repo_path):
        result.backend_framework = "Express"
        result.endpoints = _scan_express_endpoints(container, repo_path)
 
    elif _detect_rust_actix(container, repo_path):
        result.backend_framework = "Actix"

 
    # ── Database
    result.db_framework = _detect_db(container, repo_path)
 
    return result
 