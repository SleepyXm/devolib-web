import json
import os
import asyncio
from fastapi import WebSocket
import structlog
from database import database

logger = structlog.get_logger()

async def check_service_health(container, service: str) -> bool:
    """Check if a service is running by checking its port"""
    port_mapping = {
        'frontend': '3000',
        'backend': '8080',
        'database': '5432'
    }
    
    if service not in port_mapping:
        return False
    
    port = port_mapping[service]
    check_port = container.exec_run(f"netstat -tuln | grep {port}")
    
    return bool(check_port.output)

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


services_alive = {
    "container": True,
}

async def start_service(container, project_id: str, project_name: str, service: str, websocket: WebSocket):

    exists_check = await check_service_exists(container, project_id, project_name, service)
    if not exists_check['exists']:
        await websocket.send_text(f"[✗] Cannot start {service}: {exists_check['error']}\n")
        await send_service_status(websocket, {service: False})
        return

    row = await database.fetch_one(
        """
        SELECT
          s.name,
          s.category,
          s.default_start_command,
          s.default_port,
          ps.custom_start_command
        FROM project_services ps
        JOIN services s ON s.id = ps.service_id
        WHERE ps.project_id = :project_id
          AND s.category = :category
        """,
        {"project_id": project_id, "category": service},
    )

    if not row:
        await websocket.send_text(f"[✗] No {service} service configured\n")
        # Mark as dead/missing
        services_alive[service] = {
            "enabled": False,
            "port": 0,
            "status": "missing",
            "name": service
        }
        await send_service_status(websocket, services_alive)
        return

    command = row["custom_start_command"] or row["default_start_command"]
    port = row["default_port"] or 0

    # Start service
    container.exec_run(f"bash -c 'nohup {command} > /tmp/{service}.log 2>&1 &'", detach=True)
    if service == "frontend":
        container.exec_run(f"bash -c 'cd /app/workspace/frontend/{project_name} && nohup {command} >/tmp/{service}.log 2>&1 &'", detach=True)
    await websocket.send_text(f"[→] Starting {row['name']} ({service})...\n")
    logger.info(f"Started {service} for {project_name} with command: {command}")

    if service == "database":
        await asyncio.sleep(2)

        project_db = "myapp"
        check_db_cmd = (
            f'su - postgres -c "psql -lqt | cut -d \\| -f 1 | grep -qw {project_db} && echo exists || echo missing"'
        )
        check_result = container.exec_run(check_db_cmd)

        if b"exists" in check_result.output:
            schema_cmd = (
                f'su - postgres -c "psql -d {project_db} -t -A -F\'|\' '
                f'-c \\"SELECT table_name, column_name, data_type, is_nullable '
                f'FROM information_schema.columns '
                f'WHERE table_schema=\'public\' '
                f'ORDER BY table_name, ordinal_position;\\""'
            )
            schema_result = container.exec_run(schema_cmd)

            tables = {}
            for line in schema_result.output.decode().strip().split("\n"):
                if not line:
                    continue
                table, column, dtype, nullable = line.split("|")
                tables.setdefault(table, []).append({
                    "column": column,
                    "type": dtype,
                    "nullable": nullable == "YES",
                })

            await websocket.send_json({
                "type": "DATABASE_SCHEMA",
                "database": project_db,
                "tables": tables,
            })
        else:
            await websocket.send_text(f"[ℹ] Database '{project_db}' not found\n")

    # Health check
    await asyncio.sleep(3)
    is_running = await check_service_health(container, service)

    if is_running:
        await websocket.send_text(f"[✓] {row['name']} is running on port {port}\n")
        # Store full service info
        services_alive[service] = {
            "enabled": True,
            "port": port,
            "status": "running",
            "name": row['name'],
            "category": row['category']
        }
        await send_service_status(websocket, services_alive)
    else:
        log_file = f'/tmp/{service}.log'
        log_check = container.exec_run(f"tail -20 {log_file}")
        log_output = log_check.output.decode() if log_check.output else "No logs available"

        await websocket.send_text(f"[!] Failed to start {row['name']}. Logs:\n{log_output}\n")
        # Mark as failed
        services_alive[service] = {
            "enabled": False,
            "port": port,
            "status": "failed",
            "name": row['name'],
            "logs": log_output
        }
        await send_service_status(websocket, services_alive)



async def send_service_status(websocket: WebSocket, status: dict):
    """Send service status update to client"""
    await websocket.send_text(json.dumps({
        "type": "service-status",
        "data": status
    }))

async def send_error(websocket: WebSocket, message: str):
    """Send error message to client"""
    await websocket.send_text(json.dumps({
        "type": "error",
        "message": message
    }))

# Command handlers
def handle_cd_command(cmd: str, current_dir: str) -> tuple[str, str]:
    """Handle directory change commands"""
    target = cmd[3:].strip()
    new_dir = os.path.normpath(os.path.join(current_dir, target))
    return f"Changed directory to {new_dir}\n", new_dir

async def handle_json_command(container, payload: dict, current_dir: str, websocket: WebSocket, project_id: str, project_name: str):
    """Handle JSON payload commands"""
    if payload.get('type') == 'START_SERVICE':
        service = payload.get('service')
        await start_service(container, project_id, project_name, service, websocket)
        return "", current_dir
    
    # TODO Fall back to existing handle_command
    # from your_module import handle_command
    # response = await handle_command(container, payload, current_dir)
    # return response, current_dir
    return "Command handled\n", current_dir

def handle_shell_command(container, cmd: str, current_dir: str) -> tuple[str, str]:
    """Handle regular shell commands"""
    result = container.exec_run(f"bash -c 'cd {current_dir} && {cmd}'", demux=True)
    stdout, stderr = result.output
    output = ""
    if stdout:
        output += stdout.decode()
    if stderr:
        output += stderr.decode()
    return output, current_dir

async def process_command(container, cmd: str, current_dir: str, websocket: WebSocket, project_id: str, project_name: str):
    """Route command to appropriate handler"""
    cmd = cmd.strip()
    if not cmd:
        return "", current_dir
    
    # CD commands
    if cmd.startswith("cd "):
        return handle_cd_command(cmd, current_dir)
    
    # JSON commands
    if cmd.startswith("{") and cmd.endswith("}"):
        try:
            payload = json.loads(cmd)
            logger.info(f"Received JSON payload: {payload}")
            return await handle_json_command(container, payload, current_dir, websocket, project_id, project_name)
        except Exception as e:
            print(f"Error handling JSON command: {e}")
            return f"Error handling command: {str(e)}\n", current_dir
    
    # Shell commands
    return handle_shell_command(container, cmd, current_dir)
