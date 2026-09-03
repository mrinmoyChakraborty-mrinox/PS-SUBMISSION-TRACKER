import logging
from datetime import datetime, timezone
from app.collector.sources.sih2026 import SIH2026Source
from app.services import firestore
from app.notifications.fcm import send_ps_notification

logger = logging.getLogger(__name__)

async def run_collection_cycle() -> None:
    """Run one iteration of the collection process."""
    ts = datetime.now(timezone.utc)
    logger.info(f"Starting collection cycle at {ts}")
    
    try:
        source = SIH2026Source()
        results = source.fetch_all()
        
        for ps in results:
            ps_id = ps["ps_id"]
            new_count = ps["count"]
            
            try:
                existing = firestore.get_ps(ps_id)
                
                if existing is None:
                    logger.info(f"Initializing new PS: {ps_id}")
                    firestore.initialize_ps(ps, ts)
                else:
                    old_count = existing.get("count", 0)
                    
                    if new_count > old_count:
                        logger.info(f"Count increased for {ps_id}: {old_count} -> {new_count}")
                        firestore.update_ps(ps, old_count, ts)
                        firestore.create_history_entry(ps_id, new_count, old_count, ts)
                        
                        event_id = f"{ps_id}_{new_count}"
                        if not firestore.notification_event_exists(event_id):
                            success = send_ps_notification(ps_id, new_count, ps["capacity"])
                            if success:
                                firestore.create_notification_event(ps_id, new_count, old_count, ts)
                    elif new_count == old_count:
                        firestore.update_last_successful_fetch(ps_id, ts)
                    else:
                        firestore.handle_count_decrease(ps_id, old_count, new_count, ts)
                        firestore.update_ps(ps, old_count, ts)
                        
            except Exception as e:
                logger.error(f"Error processing {ps_id}: {e}")
                
        firestore.set_collector_status("healthy", ts)
        logger.info("Collection cycle completed successfully")
        
    except Exception as e:
        logger.error(f"Collection cycle failed: {e}")
        firestore.set_collector_status("error", ts, str(e))
