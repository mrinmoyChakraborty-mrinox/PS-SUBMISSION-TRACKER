import logging
from typing import List, Optional
import firebase_admin
from firebase_admin import credentials, messaging
from app.config import settings

logger = logging.getLogger(__name__)

def ensure_firebase_initialized():
    """Ensure Firebase Admin SDK is initialized before using messaging."""
    if not firebase_admin._apps:
        try:
            cred = credentials.Certificate({
                "type": "service_account",
                "project_id": settings.FIREBASE_PROJECT_ID,
                "private_key": settings.FIREBASE_PRIVATE_KEY,
                "client_email": settings.FIREBASE_CLIENT_EMAIL,
                "token_uri": "https://oauth2.googleapis.com/token",
            })
            firebase_admin.initialize_app(cred)
            logger.info(f"Initialized Firebase Admin SDK for project: {settings.FIREBASE_PROJECT_ID}")
        except Exception as e:
            logger.error(f"Failed to initialize Firebase Admin SDK in fcm.py: {e}")

def get_subscriber_tokens_for_ps(ps_id: str) -> List[str]:
    """Retrieve all device FCM tokens registered for this problem statement from Firestore."""
    tokens = set()
    try:
        from app.services.firestore import get_db
        db = get_db()
        
        # 1. Check subcollection problemStatements/{ps_id}/subscribers
        docs = db.collection("problemStatements").document(ps_id).collection("subscribers").stream()
        for doc in docs:
            t = doc.id
            if t and len(t) > 20:
                tokens.add(t)
                
        # 2. Check fcmSubscriptions where psIds array contains ps_id
        subs = db.collection("fcmSubscriptions").where("psIds", "array_contains", ps_id).stream()
        for s in subs:
            data = s.to_dict()
            t = data.get("token") or s.id
            if t and len(t) > 20:
                tokens.add(t)
    except Exception as e:
        logger.warning(f"Could not fetch subscriber tokens from Firestore for {ps_id}: {e}")
        
    return list(tokens)

def send_ps_notification(ps_id: str, count: int, capacity: int) -> bool:
    """Send FCM push notification for a new submission to both Topic and Direct Tokens."""
    ensure_firebase_initialized()
    
    topic = f"sih2026_ps_{ps_id}"
    remaining = capacity - count
    title = f"SIH 2026 Alert: {ps_id}"
    body = f"New submission recorded! {count} / {capacity} submitted ({remaining} slots left)."
    url = f"https://sihpstrackerlive.vercel.app/ps/{ps_id}"
    
    webpush_config = messaging.WebpushConfig(
        notification=messaging.WebpushNotification(
            title=title,
            body=body,
            icon="/logo.png",
            badge="/logo.png",
        ),
        fcm_options=messaging.WebpushFCMOptions(
            link=url
        ),
        headers={
            "Urgency": "high"
        }
    )
    
    success = False
    
    # 1. Send to FCM Topic
    try:
        topic_message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data={
                "psId": ps_id,
                "count": str(count),
                "capacity": str(capacity),
                "remaining": str(remaining),
                "url": f"/ps/{ps_id}",
                "click_action": url
            },
            webpush=webpush_config,
            topic=topic,
        )
        response = messaging.send(topic_message)
        logger.info(f"FCM topic notification sent to {topic} (message ID: {response})")
        success = True
    except Exception as e:
        logger.error(f"FCM topic notification failed for {topic}: {e}")

    # 2. Send directly to any registered device tokens (Instant Sub-second Multicast)
    tokens = get_subscriber_tokens_for_ps(ps_id)
    if tokens:
        logger.info(f"Delivering direct push notification to {len(tokens)} subscriber device(s) for {ps_id}...")
        try:
            multicast_message = messaging.MulticastMessage(
                notification=messaging.Notification(
                    title=title,
                    body=body,
                ),
                data={
                    "psId": ps_id,
                    "count": str(count),
                    "capacity": str(capacity),
                    "remaining": str(remaining),
                    "url": f"/ps/{ps_id}",
                    "click_action": url
                },
                webpush=webpush_config,
                tokens=tokens,
            )
            batch_response = messaging.send_each_for_multicast(multicast_message)
            logger.info(f"Direct push multicast summary for {ps_id}: {batch_response.success_count} succeeded, {batch_response.failure_count} failed")
            success = True

            # Auto-prune uninstalled or expired tokens
            try:
                from app.services.firestore import get_db
                db = get_db()
                for idx, resp in enumerate(batch_response.responses):
                    if not resp.success and "NotRegistered" in str(resp.exception):
                        dead_token = tokens[idx]
                        db.collection("problemStatements").document(ps_id).collection("subscribers").document(dead_token).delete()
                        db.collection("fcmSubscriptions").document(dead_token).delete()
                        logger.info(f"Pruned expired token: {dead_token[:15]}...")
            except Exception as prune_err:
                logger.debug(f"Token pruning notice: {prune_err}")
        except Exception as err:
            logger.error(f"FCM direct token multicast failed for {ps_id}: {err}")

    return success

def send_test_notification(token: str) -> dict:
    """Send an immediate test notification to a single device token."""
    ensure_firebase_initialized()
    
    title = "SIH 2026 Live Tracker"
    body = "🔔 Notifications are active! You will receive live alerts whenever submissions change."
    url = "https://sihpstrackerlive.vercel.app/"
    
    webpush_config = messaging.WebpushConfig(
        notification=messaging.WebpushNotification(
            title=title,
            body=body,
            icon="/logo.png",
            badge="/logo.png",
        ),
        fcm_options=messaging.WebpushFCMOptions(
            link=url
        ),
        headers={
            "Urgency": "high"
        }
    )
    
    message = messaging.Message(
        notification=messaging.Notification(
            title=title,
            body=body,
        ),
        data={
            "test": "true",
            "url": "/",
            "click_action": url
        },
        webpush=webpush_config,
        token=token,
    )
    
    try:
        msg_id = messaging.send(message)
        logger.info(f"Test notification sent to token {token[:10]}... (ID: {msg_id})")
        return {"success": True, "messageId": msg_id}
    except Exception as e:
        logger.error(f"Failed to send test notification: {e}")
        return {"success": False, "error": str(e)}
