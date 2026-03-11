

from .base_images import NETWORK_NAME
from asyncio.log import logger
import docker, structlog, re, tarfile, io, os, boto3


docker_client = docker.from_env()
logger = structlog.get_logger()

s3 = boto3.client(
    "s3",
    endpoint_url=f"https://{os.environ['CF_ACCOUNT_ID']}.r2.cloudflarestorage.com",
    aws_access_key_id=os.environ["R2_ACCESS_KEY"],
    aws_secret_access_key=os.environ["R2_SECRET_KEY"],
)


def create_and_start_container(
    project_id: str,
    project_name: str,
    base_tag: str,
    base_type: str,
    clean_name: str,
    frontend_port: int,
    backend_services: list,
    frontend_services: list,
    db: list,
) -> dict:
    """
    Creates and starts a Docker container with Traefik labels, volumes,
    network, and resource limits. Returns the container object and metadata.
    """
    try:
        logger.info(
            "Creating container",
            project_id=project_id,
            base=base_type,
            port=frontend_port,
            services=f"BE:{len(backend_services)} FE:{len(frontend_services)}",
        )

        container = docker_client.containers.create(
            image=base_tag,
            name=f"devolib_project_{project_id}",
            detach=True,
            labels={
                "traefik.enable": "true",
                f"traefik.http.routers.{project_id}.rule": f"Host(`{clean_name}.localhost`)",
                f"traefik.http.services.{project_id}.loadbalancer.server.port": str(frontend_port),
                "devolib.project_id": project_id,
                "devolib.project_name": project_name,
                "devolib.base": base_type,
                "devolib.backend_services": ",".join(backend_services),
                "devolib.frontend_services": ",".join(frontend_services),
                "devolib.db_services": ",".join(db),
            },
            volumes={
                f"devolib_project_{project_id}": {
                    "bind": "/app/workspace",
                    "mode": "rw",
                }
            },
            network=NETWORK_NAME,
            mem_limit="512m",
            cpu_quota=50000,
            command=["tail", "-f", "/dev/null"],
        )

        container.start()

        logger.info(
            "Container started",
            project_id=project_id,
            container_id=container.short_id,
            url=f"http://{clean_name}.localhost",
        )

        return {
            "container": container,
            "metadata": {
                "project_id": project_id,
                "container_id": container.id,
                "port": frontend_port,
                "url": f"http://{clean_name}.localhost",
            },
        }

    except docker.errors.APIError as e:
        logger.error("Failed to create container", project_id=project_id, error=str(e))
        raise docker.errors.APIError(
            f"Docker API error creating container for project {project_id}: {e}"
        ) from e
    except Exception as e:
        logger.error("Unexpected error creating container", project_id=project_id, error=str(e))
        raise RuntimeError(
            f"Unexpected error creating container for project {project_id}: {e}"
        ) from e
    

def _clean_name(name: str) -> str:
    """Make project name DNS-safe for Traefik routing."""
    # Only allow alphanumeric and hyphens
    clean = re.sub(r"[^a-z0-9-]", "-", name.lower())
    # Remove consecutive hyphens
    clean = re.sub(r"-+", "-", clean)
    # Strip leading/trailing hyphens
    clean = clean.strip("-")
    # Fallback if empty
    return clean or f"proj-{hash(name) % 10000}"


def scaffold_template(container, framework: str, destination: str):
    """
    Fetches template files for the given framework from the bucket,
    builds a tar archive, and puts it into the container at destination.
    """
    FRAMEWORK_TEMPLATES = {
        "React": [
            ("vite.config.js", "vite.config.js"),
            ("main.jsx", "src/main.jsx"),
            ("index.css", "src/index.css"),
            ("Routes.jsx", "src/Routes.jsx"),
        ],
        "FastAPI": [
            ("main.py", "main.py"),
        ],
        "LoggingService": [
            ("logd", "usr/local/bin/logd"),
        ],
    }

    if framework not in FRAMEWORK_TEMPLATES:
        logger.warning("No templates found for framework", framework=framework)
        return

    is_binary = framework == "LoggingService"

    tar_stream = io.BytesIO()
    with tarfile.open(fileobj=tar_stream, mode="w") as tar:
        for bucket_key, tar_path in FRAMEWORK_TEMPLATES[framework]:
            content = get_template(bucket_key, binary=is_binary)
            if not is_binary:
                content = content.encode("utf-8")
            info = tarfile.TarInfo(name=tar_path)
            info.size = len(content)
            if is_binary:
                info.mode = 0o755
            tar.addfile(info, io.BytesIO(content))
            logger.info("Added template file", framework=framework, file=tar_path)

    tar_stream.seek(0)
    container.put_archive(destination, tar_stream)
    logger.info("Scaffolded templates", framework=framework, destination=destination)

def get_template(key: str, binary: bool = False) -> str | bytes:
    response = s3.get_object(Bucket=os.environ["R2_BUCKET_NAME"], Key=key)
    content = response["Body"].read()
    return content if binary else content.decode("utf-8")