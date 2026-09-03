import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.routes import router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """API-only lifespan. No collector or scheduler runs here.
    
    The collector is fully isolated in collector_node.py and runs
    as a standalone process on the dedicated scraping machine.
    """
    logger.info("SIH 2026 Tracker API starting up (API-only mode — no collector)")
    yield
    logger.info("SIH 2026 Tracker API shutting down")


app = FastAPI(
    lifespan=lifespan,
    title="SIH 2026 Submissions Tracker API",
    description="REST API for SIH 2026 live submission counts. Collector runs separately via collector_node.py.",
    version="1.0.0"
)

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
    return {
        "status": "ok",
        "app": "SIH 2026 Submissions Tracker API",
        "mode": "api-only",
        "note": "Collector runs as a standalone process (collector_node.py) on the dedicated scraping machine."
    }

# Mount API router
app.include_router(router, prefix="/api")
app.include_router(router)

if __name__ == '__main__':
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
