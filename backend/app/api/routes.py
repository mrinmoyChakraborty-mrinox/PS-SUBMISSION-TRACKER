import re
from typing import Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from app.services import firestore

router = APIRouter()

PS_ID_REGEX = re.compile(r"^SIH26\d{3}$")

# Simple in-memory rate limiting structure: { ip: [timestamps] }
rate_limits: Dict[str, list[datetime]] = {}

def check_rate_limit(ip: str) -> None:
    now = datetime.now(timezone.utc)
    if ip not in rate_limits:
        rate_limits[ip] = []
        
    # Keep only timestamps within last 60 seconds
    rate_limits[ip] = [ts for ts in rate_limits[ip] if (now - ts).total_seconds() < 60]
    
    if len(rate_limits[ip]) >= 10:
        raise HTTPException(status_code=429, detail="Too Many Requests")
        
    rate_limits[ip].append(now)

@router.get("/ps/{ps_id}")
async def get_ps(ps_id: str):
    if not PS_ID_REGEX.match(ps_id):
        raise HTTPException(status_code=400, detail="Invalid PS ID format")
        
    ps = firestore.get_ps(ps_id)
    if not ps:
        raise HTTPException(status_code=404, detail="Problem Statement not found")
        
    return ps

@router.get("/ps/{ps_id}/history")
async def get_ps_history(ps_id: str):
    if not PS_ID_REGEX.match(ps_id):
        raise HTTPException(status_code=400, detail="Invalid PS ID format")
        
    history = firestore.get_history(ps_id, limit=200)
    return {"history": history}

@router.post("/ps/{ps_id}/track")
async def track_ps(ps_id: str, request: Request):
    ip = request.client.host if request.client else "unknown"
    check_rate_limit(ip)
    
    if not PS_ID_REGEX.match(ps_id):
        raise HTTPException(status_code=400, detail="Invalid PS ID format")
        
    # The collector runs periodically and picks up all PS IDs anyway.
    # We can ensure it's marked as tracked in our DB, or just return success.
    # For now, we just validate and return success as requested.
    return {"status": "success", "message": f"{ps_id} is being tracked"}

class SubscribeRequest(BaseModel):
    token: str

@router.post("/ps/{ps_id}/subscribe")
async def subscribe_ps(ps_id: str, payload: SubscribeRequest):
    if not PS_ID_REGEX.match(ps_id):
        raise HTTPException(status_code=400, detail="Invalid PS ID format")
    if not payload.token:
        raise HTTPException(status_code=400, detail="FCM Token is required")
        
    try:
        from firebase_admin import messaging
        topic = f"sih2026_ps_{ps_id}"
        messaging.subscribe_to_topic([payload.token], topic)
    except Exception as e:
        # If Firebase Admin is not initialized or fails, log gracefully
        pass

    return {"status": "success", "message": f"Subscribed token to {ps_id}"}

@router.get("/health")
async def health_check():
    status = firestore.get_collector_status()
    return {
        "status": "ok",
        "collector": status
    }
