import json
import os
import asyncio
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect


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

async def start_service(container, project_id: str, service: str, websocket: WebSocket):
    """Start a specific service in the container"""
    service_commands = {
        'frontend': f"bash -c 'cd /app/{project_id}/workspace/frontend/test3-nextjs && nohup npm run dev > /tmp/frontend.log 2>&1 &'",
        'backend': f"bash -c 'cd /app/{project_id}/workspace/backend && nohup python main.py > /tmp/backend.log 2>&1 &'",
        'database': f"bash -c 'nohup pg_ctl start -D /app/{project_id}/workspace/database/data > /tmp/db.log 2>&1 &'"
    }
    
    if service in service_commands:
        container.exec_run(service_commands[service], detach=True)
        await websocket.send_text(f"Starting {service} service...\n")
        print(f"Started {service} service for project {project_id}")
        
        # Wait for service to start and check health
        await asyncio.sleep(2)
        is_running = await check_service_health(container, service)
        
        if is_running:
            await websocket.send_text(f"✅ {service.capitalize()} service is running!\n")
            await send_service_status(websocket, {service: True})
        else:
            await websocket.send_text(f"⚠️ {service.capitalize()} service may not have started correctly\n")
    else:
        await websocket.send_text(f"Unknown service: {service}\n")

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

async def handle_json_command(container, payload: dict, current_dir: str, websocket: WebSocket, project_id: str):
    """Handle JSON payload commands"""
    if payload.get('type') == 'START_SERVICE':
        service = payload.get('service')
        await start_service(container, project_id, service, websocket)
        return "", current_dir
    
    # Fall back to existing handle_command (you'll need to import this)
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

async def process_command(container, cmd: str, current_dir: str, websocket: WebSocket, project_id: str):
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
            print(f"Received JSON payload: {payload}")
            return await handle_json_command(container, payload, current_dir, websocket, project_id)
        except Exception as e:
            print(f"Error handling JSON command: {e}")
            return f"Error handling command: {str(e)}\n", current_dir
    
    # Shell commands
    return handle_shell_command(container, cmd, current_dir)