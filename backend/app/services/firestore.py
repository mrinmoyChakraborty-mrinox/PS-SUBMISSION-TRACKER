import logging
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, firestore
from app.config import settings

logger = logging.getLogger(__name__)

# Initialize Firebase Admin SDK
try:
    if not firebase_admin._apps:
        cred = credentials.Certificate({
            "type": "service_account",
            "project_id": settings.FIREBASE_PROJECT_ID,
            "private_key": settings.FIREBASE_PRIVATE_KEY,
            "client_email": settings.FIREBASE_CLIENT_EMAIL,
            "token_uri": "https://oauth2.googleapis.com/token",
        })
        firebase_admin.initialize_app(cred)
except Exception as e:
    logger.error(f"Failed to initialize Firebase Admin SDK: {e}")

def get_db():
    return firestore.client()

def get_ps(ps_id: str) -> dict | None:
    """Retrieve a PS document from Firestore."""
    doc = get_db().collection("problemStatements").document(ps_id).get()
    return doc.to_dict() if doc.exists else None

def initialize_ps(ps: dict, ts: datetime) -> None:
    """Initialize a new PS document."""
    ps_data = {
        **ps,
        "firstSeenAt": ts,
        "status": "live",
        "lastNotifiedCount": None,
        "remaining": ps["capacity"] - ps["count"],
        "percentage": (ps["count"] / ps["capacity"] * 100) if ps["capacity"] > 0 else 0,
        "lastCountChangeAt": ts,
        "lastSuccessfulFetchAt": ts
    }
    get_db().collection("problemStatements").document(ps["ps_id"]).set(ps_data)

def update_ps(ps: dict, old_count: int, ts: datetime) -> None:
    """Update an existing PS document."""
    update_data = {
        "count": ps["count"],
        "capacity": ps["capacity"],
        "remaining": ps["capacity"] - ps["count"],
        "percentage": (ps["count"] / ps["capacity"] * 100) if ps["capacity"] > 0 else 0,
        "lastSuccessfulFetchAt": ts
    }
    if ps["count"] != old_count:
        update_data["lastCountChangeAt"] = ts
        
    get_db().collection("problemStatements").document(ps["ps_id"]).update(update_data)

def update_last_successful_fetch(ps_id: str, ts: datetime) -> None:
    """Update the lastSuccessfulFetchAt field."""
    get_db().collection("problemStatements").document(ps_id).update({
        "lastSuccessfulFetchAt": ts
    })

def create_history_entry(ps_id: str, count: int, previous_count: int, ts: datetime) -> None:
    """Create a new history entry for a count change."""
    get_db().collection("problemStatements").document(ps_id).collection("history").add({
        "count": count,
        "previousCount": previous_count,
        "timestamp": ts
    })

def get_history(ps_id: str, limit: int = 100) -> list[dict]:
    """Get history entries for a PS."""
    docs = get_db().collection("problemStatements").document(ps_id).collection("history") \
        .order_by("timestamp", direction=firestore.Query.DESCENDING).limit(limit).stream()
    return [doc.to_dict() for doc in docs]

def notification_event_exists(event_id: str) -> bool:
    """Check if a notification event has already been processed."""
    doc = get_db().collection("notificationEvents").document(event_id).get()
    return doc.exists

def create_notification_event(ps_id: str, count: int, previous_count: int, ts: datetime) -> None:
    """Record a notification event."""
    event_id = f"{ps_id}_{count}"
    get_db().collection("notificationEvents").document(event_id).set({
        "psId": ps_id,
        "count": count,
        "previousCount": previous_count,
        "timestamp": ts
    })

def handle_count_decrease(ps_id: str, old_count: int, new_count: int, ts: datetime) -> None:
    """Handle the anomaly of a count decreasing."""
    logger.warning(f"SUBMISSION_COUNT_DECREASE for {ps_id}: {old_count} -> {new_count}")
    get_db().collection("anomalies").add({
        "psId": ps_id,
        "type": "SUBMISSION_COUNT_DECREASE",
        "oldCount": old_count,
        "newCount": new_count,
        "timestamp": ts
    })

def set_collector_status(status: str, ts: datetime, error: str = None) -> None:
    """Update the collector status document."""
    data = {
        "status": status,
        "lastRunTime": ts,
    }
    if error is not None:
        data["lastError"] = error
        
    try:
        get_db().collection("system").document("collectorStatus").set(data, merge=True)
    except Exception as e:
        logger.error(f"Failed to write collector status to Firestore: {e}")

def get_collector_status() -> dict:
    """Get the current collector status."""
    doc = get_db().collection("system").document("collectorStatus").get()
    return doc.to_dict() if doc.exists else {}
