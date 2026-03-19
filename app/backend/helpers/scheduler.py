from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.executors.asyncio import AsyncIOExecutor
from database import database
from helpers.stopper import stop_container
from helpers.structlogger import logger

scheduler = AsyncIOScheduler(executors={"default": AsyncIOExecutor()})


async def reap_inactive_containers():
    print("reaper running")
    running = await database.fetch_one("SELECT project_id FROM projects WHERE status = 'running' LIMIT 1")
    if not running:
        return
    inactive = await database.fetch_all("""
        SELECT project_id FROM projects 
        WHERE last_online < NOW() - INTERVAL '2 minutes'
        AND status = 'running'
    """)
    print(f"found {len(inactive)} inactive containers")
    for row in inactive:
        await stop_container(row["project_id"])
        logger.info("Initiated self bomboclat for:", project_id=row["project_id"])


scheduler.add_job(reap_inactive_containers, 'interval', minutes=2)
