from routers.projects.helpers.scanners.filehandler import file_exists, read_file, find_files
import json

def detect_nextjs(container, repo_path: str) -> bool:
    return (
        file_exists(container, f"{repo_path}/next.config.js")
        or file_exists(container, f"{repo_path}/next.config.ts")
        or file_exists(container, f"{repo_path}/next.config.mjs")
    )
 
 
def detect_react(container, repo_path: str) -> bool:
    pkg_path = f"{repo_path}/package.json"
    if not file_exists(container, pkg_path):
        return False
    content = read_file(container, pkg_path)
    try:
        pkg = json.loads(content)
        deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
        return "react" in deps and "next" not in deps
    except Exception:
        return False
 
 
def detect_vue(container, repo_path: str) -> bool:
    pkg_path = f"{repo_path}/package.json"
    if not file_exists(container, pkg_path):
        return False
    content = read_file(container, pkg_path)
    try:
        pkg = json.loads(content)
        deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
        return "vue" in deps
    except Exception:
        return False
 
 
def detect_vanilla(container, repo_path: str) -> bool:
    return file_exists(container, f"{repo_path}/index.html")



def scan_nextjs_pages(container, repo_path: str) -> list:
    """
    Scan for Next.js pages using the App Router convention.
    Any file named page.tsx, page.jsx, page.ts, page.js is a route.
    Infer the route from the folder path relative to app/.
    """
    pages = []
 
    for ext in ["page.tsx", "page.jsx", "page.ts", "page.js"]:
        files = find_files(container, repo_path, ext)
        for filepath in files:
            # Normalize path relative to repo
            rel = filepath.replace(repo_path, "").lstrip("/")
 
            # Find the app/ directory segment
            parts = rel.split("/")
            if "app" not in parts:
                continue
 
            app_idx = parts.index("app")
            route_parts = parts[app_idx + 1:-1]  # strip 'app' prefix and filename
 
            # Filter out Next.js route groups (parenthesised segments)
            route_parts = [p for p in route_parts if not (p.startswith("(") and p.endswith(")"))]
 
            route = "/" + "/".join(route_parts) if route_parts else "/"
 
            pages.append({
                "route": route,
                "file": rel,
            })
 
    return pages
 
 
def scan_react_pages(container, repo_path: str) -> list:
    """
    For React, look for common router file patterns.
    We can't reliably infer routes without running the code,
    so we find the router file and return it as the root entry.
    """
    pages = []
 
    # Common router/entry file names
    router_candidates = [
        "Routes.jsx", "Routes.tsx", "Router.jsx", "Router.tsx",
        "App.jsx", "App.tsx", "main.jsx", "main.tsx",
    ]
 
    for candidate in router_candidates:
        files = find_files(container, f"{repo_path}/src", candidate)
        if files:
            rel = files[0].replace(repo_path, "").lstrip("/")
            pages.append({
                "route": "/",
                "file": rel,
            })
            break
 
    return pages
 
 
def scan_vanilla_pages(container, repo_path: str) -> list:
    html_files = find_files(container, repo_path, "*.html")
    pages = []
    for filepath in html_files:
        rel = filepath.replace(repo_path, "").lstrip("/")
        route = "/" if rel == "index.html" else f"/{rel}"
        pages.append({"route": route, "file": rel})
    return pages


def find_frontend_root(container, repo_path: str, framework: str) -> str | None:
    if framework == "Next.js":
        candidates = ["next.config.js", "next.config.ts", "next.config.mjs"]
        for candidate in candidates:
            if file_exists(container, f"{repo_path}/{candidate}"):
                return repo_path  # next.config is always at the frontend root

    elif framework == "React":
        if file_exists(container, f"{repo_path}/package.json"):
            return repo_path
        # Check common subdirs
        for subdir in ["frontend", "client", "web"]:
            if file_exists(container, f"{repo_path}/{subdir}/package.json"):
                return f"{repo_path}/{subdir}"

    elif framework == "Vue":
        if file_exists(container, f"{repo_path}/package.json"):
            return repo_path

    return repo_path  # sensible default