import logging
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, List
from app.collector.sources.sih2026 import SIH2026Source
from app.services import firestore
from app.notifications.fcm import send_ps_notification

logger = logging.getLogger(__name__)

_cycle_lock = asyncio.Lock()

async def run_collection_cycle() -> Dict[str, Any]:
    """Run one iteration of the SIH 2026 collection process.
    
    Uses high-speed batch reads & atomic batch writes for all 230+ PS records.
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
            
            logger.info(f"Fetching SIH page: {source.BASE_URL}")
            results: List[Dict[str, Any]] = await source.fetch_all()
            
            if not results:
                logger.warning("No PS records extracted from source.")
                firestore.set_collector_status("warning", start_time, "0 PS records extracted")
                return {**result_summary, "status": "warning", "durationMs": int((datetime.now(timezone.utc) - start_time).total_seconds() * 1000)}

            # Single batch read of all existing documents in Firestore
            logger.info("Reading existing PS documents from Firestore...")
            existing_map = firestore.get_all_ps_map()
            
            items_to_set: List[Dict[str, Any]] = []
            items_to_update: List[tuple[str, Dict[str, Any]]] = []
            
            changed_count = 0
            notification_count = 0

            for ps in results:
                ps_id = ps["ps_id"]
                new_count = ps["count"]
                capacity = ps["capacity"]
                
                existing = existing_map.get(ps_id)
                
                if existing is None:
                    # Initial observation — format new document data
                    ps_data = {
                        **ps,
                        "firstSeenAt": start_time,
                        "status": "live",
                        "lastNotifiedCount": None,
                        "remaining": capacity - new_count,
                        "percentage": (new_count / capacity * 100) if capacity > 0 else 0,
                        "lastCountChangeAt": start_time,
                        "lastSuccessfulFetchAt": start_time
                    }
                    items_to_set.append(ps_data)
                else:
                    old_count = existing.get("count", 0)
                    update_data = {
                        "title": ps.get("title", ""),
                        "description": ps.get("description", ""),
                        "category": ps.get("category", ""),
                        "theme": ps.get("theme", ""),
                        "count": new_count,
                        "capacity": capacity,
                        "remaining": capacity - new_count,
                        "percentage": (new_count / capacity * 100) if capacity > 0 else 0,
                        "lastSuccessfulFetchAt": start_time
                    }
                    
                    if new_count > old_count:
                        logger.info(f"Count increased for {ps_id}: {old_count} -> {new_count}")
                        update_data["lastCountChangeAt"] = start_time
                        items_to_update.append((ps_id, update_data))
                        firestore.create_history_entry(ps_id, new_count, old_count, start_time)
                        changed_count += 1
                        
                        event_id = f"{ps_id}_{new_count}"
                        if not firestore.notification_event_exists(event_id):
                            success = send_ps_notification(ps_id, new_count, capacity)
                            if success:
                                firestore.create_notification_event(ps_id, new_count, old_count, start_time)
                                notification_count += 1
                    elif new_count == old_count:
                        items_to_update.append((ps_id, update_data))
                    else:
                        logger.warning(f"Count decreased for {ps_id}: {old_count} -> {new_count}")
                        firestore.handle_count_decrease(ps_id, old_count, new_count, start_time)
                        items_to_update.append((ps_id, update_data))

            # Commit all Firestore operations in high-speed atomic batches
            if items_to_set or items_to_update:
                firestore.batch_write_ps(items_to_set, items_to_update)

            duration_ms = int((datetime.now(timezone.utc) - start_time).total_seconds() * 1000)
            
            result_summary.update({
                "status": "success",
                "psProcessed": len(results),
                "changed": changed_count,
                "notifications": notification_count,
                "durationMs": duration_ms
            })
            
            firestore.set_collector_status("healthy", start_time)
            logger.info(f"Collection cycle completed successfully in {duration_ms}ms ({len(results)} PSs written to Firestore)")
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
