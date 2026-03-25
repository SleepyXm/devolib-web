import json, asyncio
from fastapi import WebSocket
from database import database
from .helpers.service_invoker import handle_db_command, DBoperations, FileOperations, GeneralOperations, handle_file_command, push_schema, handle_package_command, handle_general_commands
from .helpers.cmdhandlers import handle_shell_command, handle_cd_command
from .helpers.containerhelper import check_service_health, check_container_health, check_service_exists
from helpers.servicestates import send_service_status, services_alive
from helpers.structlogger import logger
from helpers.queries.servicequery import get_service_query


def get_project_services(project_id: str, websocket: WebSocket = None) -> dict:
    if project_id not in services_alive:
        services_alive[project_id] = {"container": True}
    if websocket:
        services_alive[project_id]["ws"] = websocket
    return services_alive[project_id]

async def start_service(container, project_id: str, project_name: str, service: str, q: asyncio.Queue):
    project_services = get_project_services(project_id)

    try:
        container.reload()
        if container.status != "running":
            await q.put(f"[✗] Container is not running\n")
            project_services.update({k: {"enabled": False, "status": "dead"} for k in project_services if k != "container"})
            project_services["container"] = False
            await send_service_status(q, project_services)
            return
    except Exception as e:
        await q.put(f"[✗] Container unreachable: {str(e)}\n")
        services_alive.pop(project_id, None)
        await send_service_status(q, {"container": False})
        return

    row = await database.fetch_one(
        get_service_query,
        {"project_id": project_id, "category": service},
    )
    print(f"service: {service}, row: {row}")

    frontend_root = row["frontend_root"] or f"/app/workspace/{project_name}"
    backend_root = row["backend_root"] or f"/app/workspace/{project_name}"

    if not row:
        await q.put(f"[✗] No {service} service configured\n")
        project_services[service] = {"enabled": False, "port": 0, "status": "missing", "name": service}
        await send_service_status(q, project_services)
        return

    command = row["custom_start_command"] or row["default_start_command"]
    port = row["default_port"] or 0

    if service == "backend":
        container.exec_run(["sh", "-c", f"cd {backend_root} && {command} >/tmp/{service}.log 2>&1 &"], detach=True)
    elif service == "frontend":
        container.exec_run(["sh", "-c", f"cd {frontend_root} && {command} >/tmp/{service}.log 2>&1 &"], detach=True)
    elif service == "database":
        container.exec_run(["sh", "-c", f"{command} >/tmp/{service}.log 2>&1"], detach=True)
        await asyncio.sleep(0.2)
        check_result = container.exec_run(f'su - postgres -c "psql -lqt | cut -d \\| -f 1 | grep -qw myapp && echo exists || echo missing"')
        if b"exists" in check_result.output:
            await push_schema(container, project_id, q)
        else:
            await q.put(f"[ℹ] Database 'myapp' not found\n")

    print(f"executed command for {service}: {command}")
    await q.put(f"[→] Starting {row['name']} ({service})...\n")
    await asyncio.sleep(0.2)
    is_running = await check_service_health(container, service)

    if is_running:
        await q.put(f"[✓] {row['name']} is running on port {port}\n")
        project_services[service] = {"enabled": True, "port": port, "status": "running", "name": row['name'], "category": row['category']}
        await send_service_status(q, project_services)
    else:
        log_file = f'/tmp/{service}.log'
        log_check = container.exec_run(f"tail -20 {log_file}")
        log_output = log_check.output.decode() if log_check.output else "No logs available"
        await q.put(f"[!] Failed to start {row['name']}. Logs:\n{log_output}\n")
        project_services[service] = {"enabled": False, "port": port, "status": "failed", "name": row['name'], "logs": log_output}
        await send_service_status(q, project_services)


def is_log_event(line: str) -> bool:
    try:
        data = json.loads(line)
        return data.get("type") == "LOG_EVENT"
    except (json.JSONDecodeError, AttributeError):
        return False

# Command handlers
async def handle_json_command(container, payload: dict, current_dir: str, q: asyncio.Queue, project_id: str, project_name: str):
    if payload.get('type') == 'START_SERVICE':
        await start_service(container, project_id, project_name, payload.get('service'), q)
        return "", current_dir

    if payload.get('operation') in DBoperations:
        await handle_db_command(container, payload, q, project_id)
        return "", current_dir

    if payload.get('type') in FileOperations:
        await handle_file_command(container, payload, q)
        return "", current_dir

    if payload.get('type') == 'PACKAGE':
        await handle_package_command(container, payload, q)
        return None, current_dir
    
    if payload.get('type') in GeneralOperations:
        await handle_general_commands(container, payload, q)
        return "", current_dir

    return "Command handled\n", current_dir


async def process_command(container, cmd: str, current_dir: str, q: asyncio.Queue, project_id: str, project_name: str):
    cmd = cmd.strip()
    if not cmd:
        return "", current_dir

    if cmd.startswith("cd "):
        return handle_cd_command(cmd, current_dir)

    if cmd.startswith("{") and cmd.endswith("}"):
        try:
            payload = json.loads(cmd)
            logger.info(f"Received JSON payload: {payload}")
            result = await handle_json_command(container, payload, current_dir, q, project_id, project_name)
            await database.execute(
                "UPDATE projects SET last_online = NOW() WHERE project_id = :project_id",
                {"project_id": project_id}
            )
            return result
        except Exception as e:
            print(f"Error handling JSON command: {e}")
            return f"Error handling command: {str(e)}\n", current_dir

    result = handle_shell_command(container, cmd, current_dir)
    await database.execute(
        "UPDATE projects SET last_online = NOW() WHERE project_id = :project_id",
        {"project_id": project_id}
    )
    return result



async def tail_logd(container, send_queue: asyncio.Queue):
    try:
        exec_result = container.exec_run(
            "tail -f /var/log/logd.log",
            stream=True,
            tty=False,
            detach=False,
            socket=False
        )
        loop = asyncio.get_event_loop()
        read_queue = asyncio.Queue()

        def read_stream():
            for chunk in exec_result.output:
                lines = chunk.decode("utf-8", errors="replace").splitlines()
                for line in lines:
                    line = line.strip()
                    if line and is_log_event(line):
                        loop.call_soon_threadsafe(read_queue.put_nowait, line)

        loop.run_in_executor(None, read_stream)

        while True:
            try:
                line = await asyncio.wait_for(read_queue.get(), timeout=1.0)
                print(f"Forwarding log event: {line}")
                await send_queue.put(line)
            except asyncio.TimeoutError:
                continue

    except Exception as e:
        logger.warning(f"logd tail stopped: {e}")
