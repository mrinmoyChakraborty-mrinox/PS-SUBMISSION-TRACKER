import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.config import settings
from app.api.routes import router
from app.collector.worker import run_collection_cycle

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up...")
    scheduler.add_job(
        run_collection_cycle, 
        'interval', 
        seconds=settings.COLLECTOR_INTERVAL_SECONDS,
        id='collection_cycle'
    )
    scheduler.start()
    
    # Run the first cycle immediately after a short delay
    asyncio.create_task(initial_run())
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")
    scheduler.shutdown()

async def initial_run():
    await asyncio.sleep(5)
    await run_collection_cycle()

app = FastAPI(lifespan=lifespan, title="SIH 2026 Submissions Tracker")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

if __name__ == '__main__':
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
