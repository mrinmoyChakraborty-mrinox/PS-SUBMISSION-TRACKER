import logging
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, List
from app.collector.sources.sih2026 import SIH2026Source
from app.services import firestore
from app.notifications.fcm import send_ps_notification

logger = logging.getLogger(__name__)

# Mutex lock to prevent overlapping collection cycles if one cycle takes longer than 60s
_cycle_lock = asyncio.Lock()

async def run_collection_cycle() -> Dict[str, Any]:
    """Run one iteration of the SIH 2026 collection process.
    
    Guaranteed async execution within the FastAPI / AsyncIOScheduler event loop.
    Returns a result dict summarizing the cycle outcome.
    """
    if _cycle_lock.locked():
        logger.warning("Previous collection cycle is still running. Skipping this interval.")
        return {"status": "skipped", "reason": "lock_acquired"}

    async with _cycle_lock:
        start_time = datetime.now(timezone.utc)
        logger.info(f"Starting collection cycle at {start_time.isoformat()}")

        result_summary = {
            "status": "failed",
            "psProcessed": 0,
            "changed": 0,
            "notifications": 0,
            "durationMs": 0,
            "error": None
        }

        try:
            source = SIH2026Source()
            
            # Fetch all PS rows asynchronously (no nested asyncio.run!)
            logger.info(f"Fetching: {source.BASE_URL}")
            results: List[Dict[str, Any]] = await source.fetch_all()
            
            changed_count = 0
            notification_count = 0
            
            for ps in results:
                ps_id = ps["ps_id"]
                new_count = ps["count"]
                capacity = ps["capacity"]
                
                try:
                    existing = firestore.get_ps(ps_id)
                    
                    if existing is None:
                        # Rule 24: Initial observation — store current count, but NO notification
                        logger.info(f"Initializing new PS: {ps_id} with count {new_count}/{capacity} (No notification)")
                        firestore.initialize_ps(ps, start_time)
                    else:
                        old_count = existing.get("count", 0)
                        
                        if new_count > old_count:
                            logger.info(f"{ps_id}: old={old_count} new={new_count} changed=true")
                            firestore.update_ps(ps, old_count, start_time)
                            firestore.create_history_entry(ps_id, new_count, old_count, start_time)
                            changed_count += 1
                            
                            # Rule 25: Deterministic event ID for idempotency (e.g. SIH26001_328)
                            event_id = f"{ps_id}_{new_count}"
                            if not firestore.notification_event_exists(event_id):
                                success = send_ps_notification(ps_id, new_count, capacity)
                                if success:
                                    firestore.create_notification_event(ps_id, new_count, old_count, start_time)
                                    logger.info(f"FCM notification sent for {event_id}")
                                    notification_count += 1
                        elif new_count == old_count:
                            firestore.update_last_successful_fetch(ps_id, start_time)
                        else:
                            # Rule 23: Count decrease anomaly handling
                            logger.warning(f"{ps_id}: count decreased from {old_count} to {new_count} (Anomaly logged)")
                            firestore.handle_count_decrease(ps_id, old_count, new_count, start_time)
                            firestore.update_ps(ps, old_count, start_time)
                            
                except Exception as ps_err:
                    logger.error(f"Error processing {ps_id}: {ps_err}")

            duration_ms = int((datetime.now(timezone.utc) - start_time).total_seconds() * 1000)
            
            result_summary.update({
                "status": "success",
                "psProcessed": len(results),
                "changed": changed_count,
                "notifications": notification_count,
                "durationMs": duration_ms
            })
            
            firestore.set_collector_status("healthy", start_time)
            logger.info(f"Collection cycle completed successfully in {duration_ms}ms ({len(results)} PSs processed)")
            return result_summary

        except Exception as err:
            duration_ms = int((datetime.now(timezone.utc) - start_time).total_seconds() * 1000)
            logger.error(f"Collection cycle failed after {duration_ms}ms: {err}")
            
            result_summary.update({
                "status": "failed",
                "durationMs": duration_ms,
                "error": str(err)
            })
            
            firestore.set_collector_status("error", start_time, str(err))
            return result_summary
