import re
import logging
from typing import Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from app.services import firestore
from app.collector.sources.sih2026 import SIH2026Source

logger = logging.getLogger(__name__)
router = APIRouter()

PS_ID_REGEX = re.compile(r"^SIH26\d{3}$")

# Simple in-memory rate limiting structure: { ip: [timestamps] }
rate_limits: Dict[str, list[datetime]] = {}


def get_client_ip(request: Request) -> str:
    """Extract real client IP behind reverse proxies (Render, Cloudflare, Vercel)."""
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    cf_ip = request.headers.get("cf-connecting-ip")
    if cf_ip:
        return cf_ip.strip()
    return request.client.host if request.client else "unknown"


def check_rate_limit(ip: str, max_requests: int = 60) -> None:
    now = datetime.now(timezone.utc)
    if ip not in rate_limits:
        rate_limits[ip] = []

    # Keep only timestamps within last 60 seconds
    rate_limits[ip] = [ts for ts in rate_limits[ip] if (now - ts).total_seconds() < 60]

    if len(rate_limits[ip]) >= max_requests:
        raise HTTPException(status_code=429, detail="Too Many Requests")

    rate_limits[ip].append(now)


@router.get("/ps/{ps_id}")
async def get_ps(ps_id: str):
    ps_id_upper = ps_id.upper()
    if not PS_ID_REGEX.match(ps_id_upper):
        raise HTTPException(status_code=400, detail="Invalid PS ID format")

    ps = firestore.get_ps(ps_id_upper)
    if not ps:
        raise HTTPException(status_code=404, detail="Problem statement not found")

    return ps


@router.get("/ps/{ps_id}/history")
async def get_ps_history(ps_id: str):
    ps_id_upper = ps_id.upper()
    if not PS_ID_REGEX.match(ps_id_upper):
        raise HTTPException(status_code=400, detail="Invalid PS ID format")

    history = firestore.get_history(ps_id_upper, limit=200)

    # Fallback: if no history collection exists yet, synthesize a baseline point
    # from the PS document itself so the Submission Analytics graph is never empty.
    # This is persisted for future calls – the "last update time" for a fresh PS is
    # its firstSeenAt / lastCountChangeAt, and we store that as the first graph point.
    if not history:
        ps = firestore.get_ps(ps_id_upper)
        if ps:
            ts = (
                ps.get("lastCountChangeAt")
                or ps.get("firstSeenAt")
                or ps.get("lastSuccessfulFetchAt")
                or datetime.now(timezone.utc)
            )
            count = ps.get("count", 0)
            synthetic = {
                "count": count,
                "previousCount": count,
                "timestamp": ts,
            }
            # Persist baseline so next fetch has saved data even if collector is off
            try:
                firestore.create_history_entry(
                    ps_id_upper,
                    count,
                    count,
                    ts if isinstance(ts, datetime) else datetime.now(timezone.utc),
                )
            except Exception as e:
                logger.warning(
                    f"Failed to persist synthetic baseline history for {ps_id_upper}: {e}"
                )
            history = [synthetic]

    return {"history": history}


@router.post("/ps/{ps_id}/track")
async def track_ps(ps_id: str, request: Request):
    ip = get_client_ip(request)
    check_rate_limit(ip, max_requests=100)

    ps_id_upper = ps_id.upper()
    if not PS_ID_REGEX.match(ps_id_upper):
        raise HTTPException(status_code=400, detail="Invalid PS ID format")

    return {
        "status": "success",
        "success": True,
        "psId": ps_id_upper,
        "message": f"{ps_id_upper} is being tracked",
    }


class SubscribeRequest(BaseModel):
    token: str


class TestNotificationRequest(BaseModel):
    token: str


@router.post("/ps/{ps_id}/subscribe")
async def subscribe_ps(ps_id: str, payload: SubscribeRequest):
    ps_id_upper = ps_id.upper()
    if not PS_ID_REGEX.match(ps_id_upper):
        raise HTTPException(status_code=400, detail="Invalid PS ID format")
    if not payload.token:
        raise HTTPException(status_code=400, detail="FCM Token is required")

    now = datetime.now(timezone.utc)
    token = payload.token.strip()
    topic = f"sih2026_ps_{ps_id_upper}"

    # 1. Subscribe to FCM Topic via Admin SDK
    try:
        from firebase_admin import messaging

        sub_resp = messaging.subscribe_to_topic([token], topic)
        logger.info(
            f"FCM topic subscribe result for {ps_id_upper}: {sub_resp.success_count} success, {sub_resp.failure_count} failure"
        )
    except Exception as e:
        logger.warning(f"Failed to subscribe token to topic {topic}: {e}")

    # 2. Persist token in Firestore for direct multicast sending
    try:
        db = firestore.get_db()
        db.collection("problemStatements").document(ps_id_upper).collection(
            "subscribers"
        ).document(token).set({"token": token, "subscribedAt": now}, merge=True)

        db.collection("fcmSubscriptions").document(token).set(
            {
                "token": token,
                "psIds": firestore.firestore.ArrayUnion([ps_id_upper]),
                "updatedAt": now,
            },
            merge=True,
        )
        logger.info(f"Saved FCM token to Firestore subscribers for {ps_id_upper}")
    except Exception as e:
        logger.warning(f"Failed to save subscriber token to Firestore: {e}")

    return {"status": "success", "message": f"Subscribed token to {ps_id_upper}"}


@router.post("/test-notification")
async def trigger_test_notification(payload: TestNotificationRequest):
    if not payload.token:
        raise HTTPException(status_code=400, detail="FCM Token is required")
    from app.notifications.fcm import send_test_notification

    result = send_test_notification(payload.token.strip())
    if not result.get("success"):
        raise HTTPException(
            status_code=500,
            detail=result.get("error", "Failed to send test notification"),
        )
    return {"status": "success", "message": "Test notification sent successfully"}


@router.get("/health")
async def health_check():
    status = firestore.get_collector_status()
    return {"status": "ok", "collector": status}


@router.get("/debug/sih-source")
async def debug_sih_source():
    """Optional source debug endpoint returning source fetch summary."""
    try:
        source = SIH2026Source()
        records = await source.fetch_all()
        sample = records[0] if records else {}
        return {
            "url": source.BASE_URL,
            "httpStatus": 200,
            "tableFound": True,
            "rows": len(records),
            "sample": {
                "psId": sample.get("ps_id", "N/A"),
                "submittedIdeas": sample.get("raw", "N/A"),
            },
        }
    except Exception as e:
        return {"url": SIH2026Source.BASE_URL, "error": str(e), "tableFound": False}
