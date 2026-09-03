"""
Distributed Collector Node Agent for SIH 2026 Submission Tracker

Runs as a lightweight worker process on your local PC, secondary machine,
GitHub Actions cron job, or VPS node.

Features:
  - Distributed Heartbeat & Leader Lease via Firestore.
  - Automatic takeover if primary node goes offline (>45s).
  - Idempotent writes & notification deduplication (psId + eventId).
  - Works on Indian residential IPs with zero Cloudflare WAF block issues.
"""

import os
import sys
import uuid
import time
import logging
import asyncio
from datetime import datetime, timezone

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.collector.worker import run_collection_cycle
from app.services.firestore import get_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [Node %(threadName)s] %(message)s"
)
logger = logging.getLogger("CollectorNode")

NODE_ID = os.getenv("NODE_ID", f"node-{uuid.uuid4().hex[:8]}")
COLLECTOR_INTERVAL = int(os.getenv("COLLECTOR_INTERVAL_SECONDS", "60"))
LEASE_TIMEOUT_SECONDS = 45


async def update_node_heartbeat() -> None:
    """Register node heartbeat in Firestore."""
    now = datetime.now(timezone.utc)
    try:
        get_db().collection("system").document("collectorNodes").collection("nodes").document(NODE_ID).set({
            "nodeId": NODE_ID,
            "lastHeartbeat": now,
            "hostname": os.getenv("COMPUTERNAME", os.getenv("HOSTNAME", "unknown")),
            "status": "online"
        }, merge=True)
    except Exception as e:
        logger.warning(f"Heartbeat failed: {e}")


async def acquire_or_renew_lease() -> bool:
    """Try to acquire or renew leader lease in Firestore.
    
    Returns True if this node is the active leader responsible for scraping.
    """
    now = datetime.now(timezone.utc)
    lease_ref = get_db().collection("system").document("collectorLease")
    
    try:
        doc = lease_ref.get()
        if doc.exists:
            data = doc.to_dict() or {}
            leader = data.get("leaderNodeId")
            last_seen = data.get("lastRenewedAt")
            
            # If current leader is self, renew lease
            if leader == NODE_ID:
                lease_ref.update({"lastRenewedAt": now})
                return True
                
            # Check if previous leader has timed out
            if last_seen:
                # Handle Firestore datetime timestamp
                if isinstance(last_seen, datetime):
                    elapsed = (now - last_seen).total_seconds()
                else:
                    elapsed = LEASE_TIMEOUT_SECONDS + 1
                    
                if elapsed < LEASE_TIMEOUT_SECONDS:
                    logger.info(f"Node {leader} is active leader (renewed {int(elapsed)}s ago). Standing by.")
                    return False
                    
            logger.info(f"Leader lease expired or open. Node {NODE_ID} claiming leadership...")
            
        # Claim leadership
        lease_ref.set({
            "leaderNodeId": NODE_ID,
            "lastRenewedAt": now,
            "claimedAt": now
        })
        return True
    except Exception as e:
        logger.error(f"Error checking leader lease: {e}")
        return True  # Fallback to single-node mode on DB error


async def main():
    logger.info(f"⚡ Starting Distributed Collector Node: {NODE_ID}")
    logger.info(f"Cycle interval: {COLLECTOR_INTERVAL} seconds")

    while True:
        try:
            await update_node_heartbeat()
            is_leader = await acquire_or_renew_lease()
            
            if is_leader:
                logger.info("🟢 Node is Active Leader — executing collection cycle...")
                res = await run_collection_cycle()
                logger.info(f"Cycle summary: {res}")
            else:
                logger.info("🟡 Node is Secondary Backup — standing by...")

        except Exception as err:
            logger.error(f"Collector node cycle error: {err}")

        await asyncio.sleep(COLLECTOR_INTERVAL)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Collector node stopped by user.")
