

from .base_images import NETWORK_NAME
from asyncio.log import logger
import docker, re, tarfile, io, os, boto3
from helpers.dockerclient import docker_client
from helpers.structlogger import logger
import asyncio
from routers.projects.containers.labels import traefik_labels, devolib_labels

s3 = boto3.client(
    "s3",
    endpoint_url=f"https://{os.environ['CF_ACCOUNT_ID']}.r2.cloudflarestorage.com",
    aws_access_key_id=os.environ["R2_ACCESS_KEY"],
    aws_secret_access_key=os.environ["R2_SECRET_KEY"],
)

FRAMEWORK_TEMPLATES = {
    "React": [
        ("vite.config.js", "vite.config.js"),
        ("main.jsx", "src/main.jsx"),
        ("index.css", "src/index.css"),
        ("Routes.jsx", "src/Routes.jsx"),
        ("components/handlers/auth.jsx", "src/components/handlers/auth.jsx"),
        ("components/handlers/requests.js", "src/components/handlers/requests.js"),
        ("components/handlers/api.js", "src/components/handlers/api.js"),
    ],
    
    "FastAPI": [
        ("main.py", "main.py"),
    ],
    "LoggingService": [
        ("logd", "usr/local/bin/logd"),
    ],
}

BINARY_FRAMEWORKS = { "LoggingService": 
    [
        ("logd", "usr/local/bin/logd"),
    ],
}



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

    container_labels = traefik_labels(project_id, clean_name, frontend_port) | devolib_labels(project_id, project_name, base_type, backend_services, frontend_services, db)

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
            labels=container_labels,

            volumes={
                f"devolib_project_{project_id}": {
                    "bind": "/app/workspace",
                    "mode": "rw",
                }
            },
            network=NETWORK_NAME,
            mem_limit="1024m",
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
    

def clean_name(name: str) -> str:
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
    if framework not in FRAMEWORK_TEMPLATES:
        logger.warning("No templates found for framework", framework=framework)
        return

    is_binary = framework in BINARY_FRAMEWORKS

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

def get_template(key: str, binary: bool = False, retries: int = 3) -> str | bytes:
    for attempt in range(retries):
        try:
            response = s3.get_object(Bucket=os.environ["R2_BUCKET_NAME"], Key=key)
            content = response["Body"].read()
            return content if binary else content.decode("utf-8")
        except Exception as e:
            if attempt == retries - 1:
                raise
            logger.warning("Retrying template fetch", key=key, attempt=attempt + 1, error=str(e))



async def check_container_health(container) -> bool:
    try:
        container.reload()
        return container.status == "running"
    except Exception:
        return False

async def check_service_health(container, service: str) -> bool:
    port_mapping = {
        'frontend': '5173',
        'backend': '8000',
        'database': '5432'
    }
    
    if service not in port_mapping:
        return False
    
    port = port_mapping[service]
    
    # Run blocking exec_run in a thread so it doesn't block the event loop
    loop = asyncio.get_event_loop()
    
    for _ in range(10):  # retry for ~5 seconds
        check_port = await loop.run_in_executor(
            None, 
            lambda: container.exec_run(f"netstat -tuln | grep {port}")
        )
        if check_port.output:
            return True
        await asyncio.sleep(0.5)
    
    return False

async def check_service_exists(container, project_id: str, project_name: str, service: str) -> dict:
    """Check if service directory and required files exist"""
    checks = {
        'frontend': {
            'dir': f'/app/workspace/frontend/{project_name}',
            'required_files': ['package.json']
        },
        'backend': {
            'dir': f'/app/workspace/backend',
            'required_files': ['main.py']
        },
        'database': {
            'dir': f'/app/workspace/database',
            'required_files': []
        }
    }
    
    if service not in checks:
        return {'exists': False, 'error': 'Unknown service'}
    
    check = checks[service]
    
    # Check if directory exists
    dir_check = container.exec_run(f"test -d {check['dir']}")
    if dir_check.exit_code != 0:
        return {'exists': False, 'error': f"Directory {check['dir']} not found"}
    
    # Check required files
    for file in check['required_files']:
        file_check = container.exec_run(f"test -f {check['dir']}/{file}")
        if file_check.exit_code != 0:
            return {'exists': False, 'error': f"Required file {file} not found"}
    
    return {'exists': True, 'error': None}