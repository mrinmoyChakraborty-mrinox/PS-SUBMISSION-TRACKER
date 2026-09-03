import os
from dataclasses import dataclass, field
from dotenv import load_dotenv

load_dotenv()

@dataclass
class Settings:
    """Settings for the application loaded from environment variables."""
    SIH_SOURCE_URL: str = os.getenv("SIH_SOURCE_URL", "https://sih.gov.in/sih2026PS")
    COLLECTOR_INTERVAL_SECONDS: int = int(os.getenv("COLLECTOR_INTERVAL_SECONDS", "60"))
    
    FIREBASE_PROJECT_ID: str = os.getenv("FIREBASE_PROJECT_ID", "")
    FIREBASE_CLIENT_EMAIL: str = os.getenv("FIREBASE_CLIENT_EMAIL", "")
    FIREBASE_PRIVATE_KEY: str = os.getenv("FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n")
    
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    CORS_ORIGINS: list[str] = field(default_factory=lambda: os.getenv("CORS_ORIGINS", "").split(","))

settings = Settings()
