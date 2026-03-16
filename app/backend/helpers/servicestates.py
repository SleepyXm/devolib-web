from fastapi import WebSocket
import json


services_alive: dict[str, dict] = {}

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