import logging
from firebase_admin import messaging

logger = logging.getLogger(__name__)

def send_ps_notification(ps_id: str, count: int, capacity: int) -> bool:
    """Send an FCM notification for a new submission."""
    topic = f"sih2026_ps_{ps_id}"
    remaining = capacity - count
    title = f"{ps_id} — New submission"
    body = f"{count} / {capacity} submissions. {remaining} slots remaining."
    
    message = messaging.Message(
        notification=messaging.Notification(
            title=title,
            body=body,
        ),
        data={
            "psId": ps_id,
            "count": str(count),
            "capacity": str(capacity),
            "remaining": str(remaining),
            "url": f"/ps/{ps_id}"
        },
        topic=topic,
    )
    
    try:
        response = messaging.send(message)
        logger.info(f"Successfully sent message ID {response} to topic {topic}")
        return True
    except Exception as e:
        logger.error(f"Failed to send FCM notification for {ps_id}: {e}")
        return False
