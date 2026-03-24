from routers.projects.helpers.scanners.filehandler import _file_exists, _read_file, _exec
import json

def _detect_fastapi(container, repo_path: str) -> bool:
    req_path = f"{repo_path}/requirements.txt"
    if not _file_exists(container, req_path):
        return False
    content = _read_file(container, req_path).lower()
    return "fastapi" in content
 
 
def _detect_flask(container, repo_path: str) -> bool:
    req_path = f"{repo_path}/requirements.txt"
    if not _file_exists(container, req_path):
        return False
    content = _read_file(container, req_path).lower()
    return "flask" in content
 
 
def _detect_express(container, repo_path: str) -> bool:
    pkg_path = f"{repo_path}/package.json"
    if not _file_exists(container, pkg_path):
        return False
    content = _read_file(container, pkg_path)
    try:
        pkg = json.loads(content)
        deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
        return "express" in deps
    except Exception:
        return False
 
 
def _detect_rust_actix(container, repo_path: str) -> bool:
    cargo_path = f"{repo_path}/Cargo.toml"
    if not _file_exists(container, cargo_path):
        return False
    content = _read_file(container, cargo_path).lower()
    return "actix" in content



def _scan_fastapi_endpoints(container, repo_path: str) -> list:
    """Find FastAPI route definitions using grep."""
    endpoints = []
    for method in ["get", "post", "put", "delete", "patch"]:
        out = _exec(
            container,
            f"grep -rn '@.*\\.{method}\\|@app\\.{method}\\|@router\\.{method}' {repo_path} --include='*.py' 2>/dev/null"
        )
        for line in out.splitlines():
            # e.g. main.py:12:@router.get("/health")
            parts = line.split(":")
            if len(parts) >= 3:
                filepath = parts[0].replace(repo_path, "").lstrip("/")
                snippet = ":".join(parts[2:]).strip()
                # Extract path from decorator
                if '"' in snippet or "'" in snippet:
                    try:
                        path = snippet.split('"')[1] if '"' in snippet else snippet.split("'")[1]
                        endpoints.append({
                            "method": method.upper(),
                            "path": path,
                            "file": filepath,
                        })
                    except IndexError:
                        pass
    return endpoints
 
 
def _scan_express_endpoints(container, repo_path: str) -> list:
    """Find Express route definitions using grep."""
    endpoints = []
    for method in ["get", "post", "put", "delete", "patch"]:
        out = _exec(
            container,
            f"grep -rn 'router\\.{method}\\|app\\.{method}' {repo_path} --include='*.js' --include='*.ts' 2>/dev/null"
        )
        for line in out.splitlines():
            parts = line.split(":")
            if len(parts) >= 3:
                filepath = parts[0].replace(repo_path, "").lstrip("/")
                snippet = ":".join(parts[2:]).strip()
                if '"' in snippet or "'" in snippet:
                    try:
                        path = snippet.split('"')[1] if '"' in snippet else snippet.split("'")[1]
                        endpoints.append({
                            "method": method.upper(),
                            "path": path,
                            "file": filepath,
                        })
                    except IndexError:
                        pass
    return endpoints


def _find_backend_root(container, repo_path: str, framework: str) -> str | None:
    if framework == "FastAPI":
        # Look for main.py — could be at root or in a subfolder like /backend, /api, /server
        candidates = ["backend/main.py", "api/main.py", "server/main.py", "main.py"]
        for candidate in candidates:
            if _file_exists(container, f"{repo_path}/{candidate}"):
                # Return the directory containing main.py
                folder = "/".join(candidate.split("/")[:-1])
                return f"{repo_path}/{folder}" if folder else repo_path

    elif framework == "Express":
        candidates = ["backend/index.js", "api/index.js", "server/index.js", "index.js", "server.js"]
        for candidate in candidates:
            if _file_exists(container, f"{repo_path}/{candidate}"):
                folder = "/".join(candidate.split("/")[:-1])
                return f"{repo_path}/{folder}" if folder else repo_path

    return None