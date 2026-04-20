from routers.projects.helpers.scanners.filehandler import file_exists, read_file, exec, find_files
import json

def detect_fastapi(container, repo_path: str) -> bool:
    req_path = f"{repo_path}/requirements.txt"
    if not file_exists(container, req_path):
        return False
    content = read_file(container, req_path).lower()
    return "fastapi" in content
 
 
def detect_flask(container, repo_path: str) -> bool:
    req_path = f"{repo_path}/requirements.txt"
    if not file_exists(container, req_path):
        return False
    content = read_file(container, req_path).lower()
    return "flask" in content
 
 
def detect_express(container, repo_path: str) -> bool:
    pkg_path = f"{repo_path}/package.json"
    if not file_exists(container, pkg_path):
        return False
    content = read_file(container, pkg_path)
    try:
        pkg = json.loads(content)
        deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
        return "express" in deps
    except Exception:
        return False
 
 
def detect_rust_actix(container, repo_path: str) -> bool:
    cargo_path = f"{repo_path}/Cargo.toml"
    if not file_exists(container, cargo_path):
        return False
    content = read_file(container, cargo_path).lower()
    return "actix" in content



def scan_fastapi_endpoints(container, repo_path: str) -> list:
    """Find FastAPI route definitions using grep."""
    endpoints = []
    for method in ["get", "post", "put", "delete", "patch"]:
        out = exec(
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
 
 
def scan_express_endpoints(container, repo_path: str) -> list:
    """Find Express route definitions using grep."""
    endpoints = []
    for method in ["get", "post", "put", "delete", "patch"]:
        out = exec(
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


def find_backend_root(container, repo_path: str, framework: str) -> str | None:
    if framework == "FastAPI":
        candidates = ["backend/main.py", "api/main.py", "server/main.py", "main.py"]
        for candidate in candidates:
            if file_exists(container, f"{repo_path}/{candidate}"):
                folder = "/".join(candidate.split("/")[:-1])
                return f"{repo_path}/{folder}" if folder else repo_path

        # Fallback: find any main.py recursively, skip frontend/tooling dirs
        files = find_files(container, repo_path, "main.py")
        for f in files:
            if any(skip in f for skip in ["node_modules", ".next", "dist", "__pycache__"]):
                continue
            return "/".join(f.split("/")[:-1])

    elif framework == "Express":
        candidates = ["backend/index.js", "api/index.js", "server/index.js", "index.js", "server.js"]
        for candidate in candidates:
            if file_exists(container, f"{repo_path}/{candidate}"):
                folder = "/".join(candidate.split("/")[:-1])
                return f"{repo_path}/{folder}" if folder else repo_path

    return None