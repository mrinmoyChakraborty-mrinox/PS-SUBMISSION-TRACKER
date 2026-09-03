# Collector Documentation

## What the Collector Does

The collector is the central process that:
1. Fetches the SIH 2026 PS page every 60 seconds
2. Parses the HTML table to extract submission counts
3. Compares counts to Firestore (previous known values)
4. Updates Firestore when counts change
5. Sends FCM push notifications when a count increases

---

## Running the Collector

The collector runs inside the FastAPI backend as an APScheduler background job. It starts automatically when you run:

```bash
python main.py
```

You can also trigger a manual collection cycle via:

```bash
curl -X POST http://localhost:8000/api/collect
```

(Admin use only — not exposed publicly in production)

---

## Collection Cycle

```python
async def run_collection_cycle():
    try:
        # Step 1: Fetch source
        source = SIH2026Source()
        ps_list = source.fetch_all()  # 1 HTTP request
        
        # Step 2: Process each PS
        for ps in ps_list:
            existing = await firestore.get_ps(ps["ps_id"])
            
            if existing is None:
                # First observation — initialize, no notification
                await firestore.initialize_ps(ps, now)
                continue
            
            old_count = existing["count"]
            new_count = ps["count"]
            
            if new_count > old_count:
                # Submission increase — full update + notification
                await firestore.update_ps(ps, old_count, now)
                await firestore.create_history_entry(ps["ps_id"], new_count, old_count, now)
                
                event_id = f"{ps['ps_id']}_{new_count}"
                if not await firestore.notification_event_exists(event_id):
                    await firestore.create_notification_event(ps["ps_id"], new_count, old_count, now)
                    await fcm.send_ps_notification(ps["ps_id"], new_count, ps["capacity"])
                
            elif new_count == old_count:
                # No change — just update fetch timestamp
                await firestore.update_last_successful_fetch(ps["ps_id"], now)
            
            else:
                # Count decreased — anomaly
                logger.warning(f"SUBMISSION_COUNT_DECREASE: {ps['ps_id']} {old_count} → {new_count}")
                await firestore.handle_count_decrease(ps["ps_id"], old_count, new_count, now)
        
        # Step 3: Update collector status
        await firestore.set_collector_status("running", now)
    
    except RuntimeError as e:
        if "SOURCE_SCHEMA_CHANGED" in str(e):
            logger.critical(f"SOURCE_SCHEMA_CHANGED: {e}")
            await firestore.set_collector_status("error", now, str(e))
            # Alert! HTML structure changed. Parser needs updating.
    
    except Exception as e:
        logger.error(f"Collection cycle failed: {e}")
        await firestore.set_collector_status("error", now, str(e))
```

---

## Change Detection Logic

```
old_count (from Firestore) vs new_count (from SIH page)

new > old  →  SUBMISSION_INCREASE
             • Update Firestore
             • Create history entry
             • Check idempotency
             • Send FCM notification

new == old →  NO_CHANGE
             • Update lastSuccessfulFetchAt only
             • No notification
             • No history entry

new < old  →  SUBMISSION_COUNT_DECREASE (anomaly)
             • Log the anomaly
             • Update Firestore with new value
             • Store in anomalies collection
             • No notification
             • Possible causes: SIH correction, data reset, scraping inconsistency
```

---

## First Observation

When the collector sees a PS for the first time:

```
Firestore: no document exists
Source: SIH26042 count = 327

Action:
  - Create Firestore document with count = 327
  - Set lastNotifiedCount = null
  - Do NOT send notification
  - Do NOT create history entry

Next cycle (60s later):
  - Source: SIH26042 count = 328
  - old = 327, new = 328
  - SUBMISSION_INCREASE detected
  - Send notification ✓
```

---

## Idempotency

Notification events use a deterministic ID:

```
{PS_ID}_{COUNT}

Example: SIH26042_328
```

Before sending FCM:

```python
event_id = f"SIH26042_328"
if await firestore.notification_event_exists(event_id):
    logger.info(f"Skipping duplicate notification: {event_id}")
    return

# Create the event FIRST (idempotent write)
await firestore.create_notification_event(...)

# Then send FCM
await fcm.send_ps_notification(...)
```

This means:
- If the worker crashes after writing the event but before FCM, no duplicate will be sent on restart
- If the worker runs twice concurrently (shouldn't happen, but just in case), only one notification fires

---

## Source Failure Handling

```
SIH site unreachable
    ↓
requests.exceptions.Timeout or HTTPError
    ↓
Collector catches exception
    ↓
Does NOT overwrite Firestore counts
    ↓
Sets collectorStatus.status = "error"
    ↓
Logs error with timestamp
    ↓
Waits 60s and retries
    ↓
Frontend shows:
  ● DATA STALE
  Last successful update: 12:04 PM
```

The frontend uses `lastSuccessfulFetchAt` to determine staleness:

```
if (now - lastSuccessfulFetchAt) > (3 × COLLECTOR_INTERVAL_SECONDS):
    status = "stale"
```

---

## Source Schema Change Detection

```
GET https://sih.gov.in/sih2026PS
    ↓
HTML parsed
    ↓
table#dataTablePS NOT found
    ↓
raise RuntimeError("SOURCE_SCHEMA_CHANGED: table#dataTablePS not found in response")
    ↓
Collector STOPS the cycle
    ↓
collectorStatus.status = "error"
    ↓
Alert logged: CRITICAL
    ↓
Action required: update sih2026.py parser
```

This is a critical failure mode — it means SIH has changed their page structure. The app will show stale data until the parser is updated.

---

## Count Parsing Rules

```
Input: "327/500"
Output: { count: 327, capacity: 500, raw: "327/500" }

Input: "0/500"
Output: { count: 0, capacity: 500, raw: "0/500" }

Input: "500/500"
Output: { count: 500, capacity: 500, raw: "500/500" }

Input: "abc/500"
Raises: ValueError("Invalid count format: 'abc/500'")
→ Row is skipped, NOT converted to 0

Input: "327"
Raises: ValueError("No '/' separator in count: '327'")
→ Row is skipped

Input: ""
Raises: ValueError("Empty count string")
→ Row is skipped
```

---

## Environment Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `SIH_SOURCE_URL` | `https://sih.gov.in/sih2026PS` | Source URL |
| `COLLECTOR_INTERVAL_SECONDS` | `60` | Polling interval |

Do not set `COLLECTOR_INTERVAL_SECONDS` below 30. The SIH page doesn't update that frequently and aggressive polling may be blocked.

---

## Logs

The collector produces structured logs:

```
2026-09-03 12:04:37 INFO  Collection cycle started
2026-09-03 12:04:38 INFO  Fetched SIH page: 226 PS rows found
2026-09-03 12:04:38 INFO  SIH26042: count unchanged (327)
2026-09-03 12:04:38 INFO  SIH26091: count increased 411 → 412
2026-09-03 12:04:38 INFO  FCM sent to sih2026_ps_SIH26091: msg_id=...
2026-09-03 12:04:39 INFO  Collection cycle complete (226 PS, 1 change, 1.2s)
2026-09-03 12:05:37 INFO  Collection cycle started
...
2026-09-03 12:07:41 ERROR Collection cycle failed: ConnectionTimeout
2026-09-03 12:07:41 WARN  Retaining last known Firestore values
```
