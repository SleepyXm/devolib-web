import asyncio
from datetime import datetime
from fastapi import WebSocket
from fastapi.websockets import WebSocketDisconnect
from helpers.structlogger import logger
from helpers.servicestates import send_service_status
from routers.projects.services import process_command, tail_logd

async def run_terminal_session(websocket: WebSocket, container, project_id: str, project_name: str):
    send_queue = asyncio.Queue()

    async def sender():
        while True:
            msg = await send_queue.get()
            if msg is None:
                break
            try:
                await websocket.send_text(msg)
            except Exception as e:
                logger.warning("websocket send failed", error=str(e))

    sender_task = asyncio.create_task(sender())
    logd_task = asyncio.create_task(tail_logd(container, send_queue))

    await send_queue.put(f"User connected at {datetime.utcnow().isoformat()}!\n")
    await send_service_status(send_queue, {"container": True})

    current_dir = "/app/workspace"
    try:
        while True:
            cmd = await websocket.receive_text()
            output, current_dir = await process_command(container, cmd, current_dir, send_queue, project_id, project_name)
            if output:
                await send_queue.put(output)
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected", project_id=project_id)
    except Exception as e:
        logger.error("WebSocket error", project_id=project_id, error=str(e))
        await send_queue.put(f"Connection error: {str(e)}\n")
    finally:
        logd_task.cancel()
        await send_queue.put(None)
        await sender_task