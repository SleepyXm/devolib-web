BACKEND_MARKERS = {"routes", "routers", "controllers", "middleware", "services", "models", "schemas", "db", "database", "migrations", "api"}
FRONTEND_MARKERS = {"components", "pages", "app", "src", "hooks", "styles", "layouts", "views", "assets", "public", "ui"}


def _infer_context(rel_path: str) -> str:
    parts = set(rel_path.lower().replace("\\", "/").split("/"))
    if parts & BACKEND_MARKERS:
        return "backend"
    if parts & FRONTEND_MARKERS:
        return "frontend"
    return "frontend"  # default to frontend if ambiguous

def _scan_groups(container, root_path: str, context: str) -> list:
    """
    Recursively walk root_path and build groups.
    context is "frontend" or "backend" — used to infer meta.
    """
    result = container.exec_run(
        f"find {root_path} "
        r"-not \( -path '*/node_modules/*' -o -path '*/.git/*' "
        r"-o -path '*/.next/*' -o -path '*/dist/*' -o -path '*/__pycache__/*' \) "
        r"-type f",
        tty=False, detach=False,
    )

    if not result.output:
        return []

    files_by_dir: dict[str, list] = {}

    for path in result.output.decode().strip().splitlines():
        path = path.strip()
        if not path.startswith(root_path):
            continue
        rel = path[len(root_path):].lstrip("/")
        if not rel:
            continue

        parent = "/".join(rel.split("/")[:-1]) or ""
        filename = rel.split("/")[-1]
        ext = filename.rsplit(".", 1)[-1] if "." in filename else ""
        name = filename.rsplit(".", 1)[0]

        if parent not in files_by_dir:
            files_by_dir[parent] = []

        files_by_dir[parent].append({
            "name": name,
            "filepath": filename,
            "meta": _infer_meta(name, ext, parent, context),
        })

    groups = []
    for dir_rel in sorted(files_by_dir.keys()):
        if dir_rel == "":
            continue
        label = dir_rel.split("/")[-1].replace("-", " ").replace("_", " ").title()
        groups.append({
            "label": label,
            "root": dir_rel,
            "context": _infer_context(dir_rel),  # ← "frontend" or "backend"
            "files": files_by_dir.get(dir_rel, []),
        })

    return groups


def _infer_meta(name: str, ext: str, folder: str, context: str) -> dict:
    meta = {}
    folder_lower = folder.lower()
    name_lower = name.lower()

    if context == "frontend":
        # type
        if "hook" in name_lower or name_lower.startswith("use"):
            meta["type"] = "hook"
        elif "middleware" in folder_lower or "middleware" in name_lower:
            meta["type"] = "middleware"
        elif "handler" in folder_lower or "wrapper" in name_lower:
            meta["type"] = "wrapper"
        elif ext in ("jsx", "tsx"):
            meta["type"] = "helper"

        # category
        if "auth" in name_lower or "auth" in folder_lower:
            meta["category"] = "auth"
        elif "api" in name_lower or "request" in name_lower or "http" in name_lower:
            meta["category"] = "http"
        elif "valid" in name_lower:
            meta["category"] = "validation"
        elif "payment" in name_lower or "stripe" in name_lower:
            meta["category"] = "payment"

        # compatibility
        if ext in ("jsx",):
            meta["compatibility"] = "React"
        elif ext in ("tsx",):
            meta["compatibility"] = "Next.js"
        elif ext in ("vue",):
            meta["compatibility"] = "Vue"

    elif context == "backend":
        if "middleware" in folder_lower or "middleware" in name_lower:
            meta["type"] = "middleware"
        elif "helper" in folder_lower or "util" in folder_lower:
            meta["type"] = "helper"
        elif "wrapper" in name_lower:
            meta["type"] = "wrapper"

        if "auth" in name_lower or "auth" in folder_lower:
            meta["category"] = "auth"
        elif "route" in folder_lower or "router" in folder_lower:
            meta["category"] = "http"
        elif "valid" in name_lower:
            meta["category"] = "validation"

    return meta if meta else {}