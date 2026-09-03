"""
SIH 2026 Submission Tracker — Standalone Collector Node
========================================================

Run this ONLY on your local scraping machine (e.g. LAPTOP-D3EKRMRS).
The Render API (main.py) does NOT run this — it is API-only.

Usage:
    python collector_node.py

Features:
  - Distributed leader lease via Firestore (safe to run on multiple machines)
  - Automatic leadership takeover if primary node goes offline (>45s)
  - Heartbeat registration every cycle
  - Idempotent writes & FCM notification deduplication
"""

import os
import sys
import socket
import uuid
import logging
import asyncio
from datetime import datetime, timezone

# Ensure backend/ is on the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.collector.worker import run_collection_cycle
from app.services.firestore import get_db

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("CollectorNode")

# ── Node identity ─────────────────────────────────────────────────────────────
HOSTNAME = os.getenv("COMPUTERNAME", os.getenv("HOSTNAME", socket.gethostname()))
NODE_ID = os.getenv("NODE_ID", f"node-{HOSTNAME.lower()}-{uuid.uuid4().hex[:6]}")
COLLECTOR_INTERVAL = int(os.getenv("COLLECTOR_INTERVAL_SECONDS", "60"))
LEASE_TIMEOUT_SECONDS = 90   # declare old leader dead after 90s of silence

# Friendly display name
if "LAPTOP-D3EKRMRS" in HOSTNAME.upper():
    NODE_DISPLAY = f"MRINMOY's Machine ({HOSTNAME})"
else:
    NODE_DISPLAY = f"Collector Node ({HOSTNAME})"


# ── Firestore helpers ─────────────────────────────────────────────────────────

async def update_heartbeat() -> None:
    """Write a heartbeat document to Firestore so the UI can show node status."""
    now = datetime.now(timezone.utc)
    try:
        get_db().collection("system").document("collectorNodes") \
            .collection("nodes").document(NODE_ID).set({
                "nodeId": NODE_ID,
                "hostname": HOSTNAME,
                "displayName": NODE_DISPLAY,
                "lastHeartbeat": now,
                "status": "online"
            }, merge=True)
    except Exception as e:
        logger.warning(f"Heartbeat write failed: {e}")


async def acquire_or_renew_lease() -> bool:
    """Try to acquire or renew the Firestore leader lease.

    Returns True if THIS node is the active scraping leader.
    Only the leader runs the collection cycle and sends FCM notifications.
    """
    now = datetime.now(timezone.utc)
    lease_ref = get_db().collection("system").document("collectorLease")

    try:
        doc = lease_ref.get()

        if doc.exists:
            data = doc.to_dict() or {}
            current_leader = data.get("leaderNodeId")
            last_renewed = data.get("lastRenewedAt")

            # Already the leader — just renew
            if current_leader == NODE_ID:
                lease_ref.update({
                    "lastRenewedAt": now,
                    "hostname": HOSTNAME,
                    "displayName": NODE_DISPLAY
                })
                return True

            # Check if the current leader is still alive
            if last_renewed and isinstance(last_renewed, datetime):
                elapsed = (now - last_renewed).total_seconds()
                if elapsed < LEASE_TIMEOUT_SECONDS:
                    logger.info(
                        f"Standing by — leader is {data.get('displayName', current_leader)} "
                        f"(renewed {int(elapsed)}s ago)"
                    )
                    return False

            logger.info(f"Leader lease expired ({LEASE_TIMEOUT_SECONDS}s). Claiming leadership...")

        # Claim leadership
        lease_ref.set({
            "leaderNodeId": NODE_ID,
            "hostname": HOSTNAME,
            "displayName": NODE_DISPLAY,
            "lastRenewedAt": now,
            "claimedAt": now,
            "status": "online"
        })
        logger.info(f"✅ Leadership claimed by {NODE_DISPLAY}")
        return True

    except Exception as e:
        logger.error(f"Lease check failed: {e} — running in fallback single-node mode")
        return True   # Safe fallback: run anyway if Firestore is unreachable


# ── Main loop ─────────────────────────────────────────────────────────────────

async def main() -> None:
    logger.info("=" * 60)
    logger.info(f"  SIH 2026 Standalone Collector Node")
    logger.info(f"  Node ID : {NODE_ID}")
    logger.info(f"  Machine : {NODE_DISPLAY}")
    logger.info(f"  Interval: every {COLLECTOR_INTERVAL}s")
    logger.info("=" * 60)

    while True:
        try:
            await update_heartbeat()
            is_leader = await acquire_or_renew_lease()

            if is_leader:
                logger.info("🟢 ACTIVE LEADER — running collection cycle...")
                summary = await run_collection_cycle()
                logger.info(
                    f"✔ Cycle done in {summary.get('durationMs', '?')}ms — "
                    f"{summary.get('psProcessed', 0)} PSs | "
                    f"{summary.get('changed', 0)} changed | "
                    f"{summary.get('notifications', 0)} notifications sent"
                )
            else:
                logger.info("🟡 STANDBY — another node is active leader")

        except Exception as err:
            logger.error(f"Unexpected error in main loop: {err}", exc_info=True)

        await asyncio.sleep(COLLECTOR_INTERVAL)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Collector node stopped (KeyboardInterrupt). Goodbye.")
