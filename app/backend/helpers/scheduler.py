from apscheduler.schedulers.asyncio import AsyncIOScheduler
from database import database
from routers.projects.container import stop_container

scheduler = AsyncIOScheduler()

async def reap_inactive_containers():
    print("reaper running")
    inactive = await database.fetch_all("""
        SELECT project_id FROM projects 
        WHERE last_online < NOW() - INTERVAL '30 seconds'
        AND status = 'running'
    """)
    print(f"found {len(inactive)} inactive containers")
    for row in inactive:
        await stop_container(row["project_id"])


scheduler.add_job(reap_inactive_containers, 'interval', seconds=30)