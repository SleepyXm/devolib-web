from routers.projects.helpers.containerhelper import clean_name as clean_project_name
from routers.projects.helpers.base_images import ensure_exists
from database import database

def pick_base_image(backend_services: list, frontend_services: list, db: list) -> str:

    has_be = bool(backend_services)
    has_fe = bool(frontend_services)
    has_db = bool(db)

    if has_be and has_fe and has_db:
        return "fullstacktest"
    else:
        return "fullstacktest"


async def project_services_config(
    project_name: str,
    backend_services: list,
    frontend_services: list,
    db: list,
) -> dict:
    all_services = backend_services + frontend_services + db

    service_configs = await database.fetch_all(
        """
        SELECT framework, default_port, scaffold_command, start_flags, default_packages
        FROM services
        WHERE framework = ANY(:frameworks)
        """,
        {"frameworks": all_services},
    )

    configs_map = {config["framework"]: dict(config) for config in service_configs}

    frontend_port = next(
        (
            configs_map[fw]["default_port"]
            for fw in frontend_services
            if fw in configs_map and configs_map[fw]["default_port"]
        ),
        3000,
    )

    base_type = pick_base_image(backend_services, frontend_services, db)
    base_tag = ensure_exists(base_type)
    clean_name = clean_project_name(project_name)

    return {
        "configs_map": configs_map,
        "frontend_port": frontend_port,
        "base_type": base_type,
        "base_tag": base_tag,
        "clean_name": clean_name,
    }