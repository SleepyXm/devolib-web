def traefik_labels(project_id: str, clean_name: str, frontend_port: int) -> dict:
    return {
        "traefik.enable": "true",
        f"traefik.http.routers.{project_id}.rule": f"Host(`{clean_name}.localhost`)",
        f"traefik.http.services.{project_id}.loadbalancer.server.port": str(frontend_port),
        f"traefik.http.routers.{project_id}.middlewares": f"{project_id}-headers",
        f"traefik.http.middlewares.{project_id}-headers.headers.customResponseHeaders.Access-Control-Allow-Origin": "*",
        f"traefik.http.middlewares.{project_id}-headers.headers.customResponseHeaders.X-Frame-Options": "ALLOWALL",
        f"traefik.http.middlewares.{project_id}-headers.headers.customResponseHeaders.Content-Security-Policy": "frame-ancestors *",
    }


def devolib_labels(
    project_id: str,
    project_name: str,
    base_type: str,
    backend_services: list,
    frontend_services: list,
    db: list,
) -> dict:
    return {
        "devolib.project_id": project_id,
        "devolib.project_name": project_name,
        "devolib.base": base_type,
        "devolib.backend_services": ",".join(backend_services),
        "devolib.frontend_services": ",".join(frontend_services),
        "devolib.db_services": ",".join(db),
    }