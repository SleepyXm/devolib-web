import json
import asyncio


services_alive: dict[str, dict] = {}

async def send_service_status(q: asyncio.Queue, status: dict):
    await q.put(json.dumps({"type": "service-status", "data": status}))

async def send_error(q: asyncio.Queue, message: str):
    await q.put(json.dumps({"type": "error", "message": message}))