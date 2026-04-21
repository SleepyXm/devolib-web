from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.executors.asyncio import AsyncIOExecutor
from database import database
from helpers.stopper import stop_container
from helpers.structlogger import logger

scheduler = AsyncIOScheduler(executors={"default": AsyncIOExecutor()})


async def reap_inactive_containers():
    print("Reaper running...")
    
    # Fetch inactive containers that are running and last online > 2 minutes ago
    inactive = await database.fetch_all("""
        SELECT project_id FROM projects 
        WHERE last_online < NOW() - INTERVAL '2 minutes'
        AND status = 'running'
    """)
    
    print(f"Found {len(inactive)} inactive containers.")
    
    for row in inactive:
        project_id = row["project_id"]
        await stop_container(project_id)
        logger.info(f"Taking project {project_id} offline.")


scheduler.add_job(reap_inactive_containers, 'interval', minutes=2)
