from routers.projects.helpers.scanners.filehandler import _file_exists, _read_file
import json

def _detect_db(container, repo_path: str) -> str | None:
    # Prisma
    if _file_exists(container, f"{repo_path}/prisma/schema.prisma"):
        return "Prisma"
 
    # Python ORMs
    req_path = f"{repo_path}/requirements.txt"
    if _file_exists(container, req_path):
        content = _read_file(container, req_path).lower()
        if "sqlalchemy" in content or "psycopg" in content or "asyncpg" in content:
            return "PostgreSQL"
        if "pymongo" in content:
            return "MongoDB"
 
    # Node ORMs / drivers
    pkg_path = f"{repo_path}/package.json"
    if _file_exists(container, pkg_path):
        content = _read_file(container, pkg_path)
        try:
            pkg = json.loads(content)
            deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
            if "pg" in deps or "@prisma/client" in deps:
                return "PostgreSQL"
            if "mysql2" in deps or "mysql" in deps:
                return "MySQL"
            if "mongoose" in deps or "mongodb" in deps:
                return "MongoDB"
            if "better-sqlite3" in deps or "sqlite3" in deps:
                return "SQLite"
        except Exception:
            pass
 
    return None