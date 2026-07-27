"""APScheduler background jobs."""
import asyncio
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.database import AsyncSessionLocal
from app.services.booking_service import run_scheduler_jobs

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


def start_scheduler():
    scheduler.add_job(
        _run_jobs,
        trigger="interval",
        minutes=1,
        id="booking_maintenance",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler started — running every 60 seconds")


async def _run_jobs():
    logger.info("Running scheduled booking maintenance...")
    try:
        await run_scheduler_jobs(AsyncSessionLocal)
    except Exception as e:
        logger.error(f"Scheduler job failed: {e}")
