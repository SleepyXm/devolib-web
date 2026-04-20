BACKEND_MARKERS = {"routes", "routers", "controllers", "middleware", "services", "models", "schemas", "db", "database", "migrations", "api"}
FRONTEND_MARKERS = {"components", "pages", "app", "src", "hooks", "styles", "layouts", "views", "assets", "public", "ui"}


def _infer_context(rel_path: str) -> str:
    parts = set(rel_path.lower().replace("\\", "/").split("/"))
    if parts & BACKEND_MARKERS:
        return "backend"
    if parts & FRONTEND_MARKERS:
        return "frontend"
    return "frontend"  # default to frontend if ambiguous

def build_tree(container, root_path: str, context: str) -> list:
    result = container.exec_run(
        f"find {root_path} "
        r"-not \( -path '*/node_modules/*' -o -path '*/.git/*' "
        r"-o -path '*/.next/*' -o -path '*/dist/*' -o -path '*/__pycache__/*' \) ",
        tty=False, detach=False,
    )

    if not result.output:
        return []

    paths = [p.strip() for p in result.output.decode().strip().splitlines() if p.strip()]
    
    # Build nested dict structure
    tree = {}
    for path in sorted(paths):
        if not path.startswith(root_path):
            continue
        rel = path[len(root_path):].lstrip("/")
        if not rel:
            continue
        parts = rel.split("/")
        node = tree
        for part in parts:
            node = node.setdefault(part, {})

    def dict_to_nodes(d: dict, current_path: str) -> list:
        nodes = []
        for name, children in sorted(d.items()):
            rel = f"{current_path}/{name}".lstrip("/")
            if children:
                nodes.append({
                    "name": name,
                    "filepath": rel,
                    "type": "folder",
                    "context": _infer_context(rel),
                    "children": dict_to_nodes(children, rel)
                })
            else:
                ext = name.rsplit(".", 1)[-1] if "." in name else ""
                stem = name.rsplit(".", 1)[0]
                nodes.append({
                    "name": stem,
                    "filepath": rel,
                    "type": "file",
                    "meta": _infer_meta(stem, ext, current_path, context)
                })
        return nodes

    return dict_to_nodes(tree, "")


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