import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.config import settings
from app.api.routes import router
from app.collector.worker import run_collection_cycle
from app.collector.sources.sih2026 import SIH2026Source

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up FastAPI application...")
    
    # Pre-warm shared browser instance
    try:
        await SIH2026Source.init_browser()
    except Exception as e:
        logger.warning(f"Could not pre-warm browser on startup: {e}")
        
    # Configure scheduler with max_instances=1 and coalesce=True
    scheduler.add_job(
        run_collection_cycle, 
        'interval', 
        seconds=settings.COLLECTOR_INTERVAL_SECONDS,
        id='sih_collection',
        max_instances=1,
        coalesce=True,
        replace_existing=True
    )
    scheduler.start()
    
    # Run the first cycle 5 seconds after startup
    asyncio.create_task(initial_run())
    
    yield
    
    # Shutdown
    logger.info("Shutting down application...")
    scheduler.shutdown(wait=False)
    await SIH2026Source.close_browser()

async def initial_run():
    await asyncio.sleep(5)
    await run_collection_cycle()

app = FastAPI(lifespan=lifespan, title="SIH 2026 Submissions Tracker")

origins = [o.strip() for o in settings.CORS_ORIGINS if o.strip()]
is_wildcard = "*" in origins or not origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if is_wildcard else origins,
    allow_credentials=not is_wildcard,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root route for Render health checks (prevents 404 on GET/HEAD /)
@app.get("/")
@app.head("/")
async def root():
    return {"status": "ok", "app": "SIH 2026 Submissions Tracker API"}

# Mount API router
app.include_router(router, prefix="/api")
app.include_router(router)

if __name__ == '__main__':
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
