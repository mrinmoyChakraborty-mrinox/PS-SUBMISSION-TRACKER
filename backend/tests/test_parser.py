import os
import pytest
import responses
from requests.exceptions import Timeout
from app.collector.sources.sih2026 import SIH2026Source
from app.collector.parser import parse_submission_count
from app.collector.worker import run_collection_cycle
import app.services.firestore as firestore
from app.notifications.fcm import send_ps_notification

FIXTURE_PATH = os.path.join(os.path.dirname(__file__), "fixtures", "sih2026_sample.html")

@pytest.fixture
def sample_html():
    with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
        return f.read()

def test_table_exists(sample_html):
    source = SIH2026Source()
    results = source.parse(sample_html)
    assert len(results) == 10

def test_ps_id_extraction(sample_html):
    source = SIH2026Source()
    results = source.parse(sample_html)
    ps_ids = [r["ps_id"] for r in results]
    assert "SIH26042" in ps_ids

def test_count_extraction():
    res = parse_submission_count("327/500")
    assert res["count"] == 327

def test_capacity_extraction():
    res = parse_submission_count("327/500")
    assert res["capacity"] == 500

def test_valid_row(sample_html):
    source = SIH2026Source()
    results = source.parse(sample_html)
    sih26042 = next(r for r in results if r["ps_id"] == "SIH26042")
    assert sih26042["title"] == "Lunar Mapping"
    assert sih26042["category"] == "Hardware"
    assert sih26042["theme"] == "SpaceTech"
    assert sih26042["deadline"] == "20 September 2026"
    assert sih26042["count"] == 327
    assert sih26042["capacity"] == 500

def test_invalid_row_few_cells():
    source = SIH2026Source()
    html = '<table id="dataTablePS"><tbody><tr><td>1</td><td>2</td></tr></tbody></table>'
    results = source.parse(html)
    assert len(results) == 0

def test_invalid_count_format():
    with pytest.raises(ValueError):
        parse_submission_count("abc/500")

def test_invalid_count_no_slash():
    with pytest.raises(ValueError):
        parse_submission_count("327")

def test_unknown_ps(sample_html):
    source = SIH2026Source()
    results = source.parse(sample_html)
    sih_unknown = next((r for r in results if r["ps_id"] == "SIH26999"), None)
    assert sih_unknown is None

def test_full_ps(sample_html):
    source = SIH2026Source()
    results = source.parse(sample_html)
    full_ps = next(r for r in results if r["ps_id"] == "SIH26200")
    assert full_ps["count"] == 500
    assert full_ps["capacity"] == 500

def test_zero_count(sample_html):
    source = SIH2026Source()
    results = source.parse(sample_html)
    zero_ps = next(r for r in results if r["ps_id"] == "SIH26300")
    assert zero_ps["count"] == 0

def test_missing_table():
    source = SIH2026Source()
    with pytest.raises(RuntimeError, match="SOURCE_SCHEMA_CHANGED"):
        source.parse("<html><body></body></html>")

def test_source_timeout(mocker):
    """Verify that a Playwright fetch timeout propagates as an exception."""
    mocker.patch(
        'app.collector.sources.sih2026.asyncio.run',
        side_effect=TimeoutError("Playwright navigation timed out")
    )
    source = SIH2026Source()
    with pytest.raises(TimeoutError):
        source.fetch_all()

# Mocking tests for worker logic below
@pytest.mark.asyncio
async def test_count_increase_triggers_notification(mocker):
    mocker.patch('app.collector.sources.sih2026.SIH2026Source.fetch_all', return_value=[{"ps_id": "SIH26001", "count": 10, "capacity": 500}])
    mocker.patch('app.services.firestore.get_ps', return_value={"ps_id": "SIH26001", "count": 5, "capacity": 500})
    mocker.patch('app.services.firestore.update_ps')
    mocker.patch('app.services.firestore.create_history_entry')
    mocker.patch('app.services.firestore.notification_event_exists', return_value=False)
    mocker.patch('app.services.firestore.create_notification_event')
    mocker.patch('app.services.firestore.set_collector_status')
    
    mock_fcm = mocker.patch('app.collector.worker.send_ps_notification', return_value=True)
    
    await run_collection_cycle()
    
    mock_fcm.assert_called_once_with("SIH26001", 10, 500)

@pytest.mark.asyncio
async def test_duplicate_notification_prevention(mocker):
    mocker.patch('app.collector.sources.sih2026.SIH2026Source.fetch_all', return_value=[{"ps_id": "SIH26001", "count": 10, "capacity": 500}])
    mocker.patch('app.services.firestore.get_ps', return_value={"ps_id": "SIH26001", "count": 5, "capacity": 500})
    mocker.patch('app.services.firestore.update_ps')
    mocker.patch('app.services.firestore.create_history_entry')
    mocker.patch('app.services.firestore.notification_event_exists', return_value=True)
    mocker.patch('app.services.firestore.set_collector_status')
    
    mock_fcm = mocker.patch('app.collector.worker.send_ps_notification')
    
    await run_collection_cycle()
    
    mock_fcm.assert_not_called()

@pytest.mark.asyncio
async def test_count_unchanged_no_notification(mocker):
    mocker.patch('app.collector.sources.sih2026.SIH2026Source.fetch_all', return_value=[{"ps_id": "SIH26001", "count": 10, "capacity": 500}])
    mocker.patch('app.services.firestore.get_ps', return_value={"ps_id": "SIH26001", "count": 10, "capacity": 500})
    mocker.patch('app.services.firestore.update_last_successful_fetch')
    mocker.patch('app.services.firestore.set_collector_status')
    
    mock_fcm = mocker.patch('app.collector.worker.send_ps_notification')
    
    await run_collection_cycle()
    
    mock_fcm.assert_not_called()

@pytest.mark.asyncio
async def test_count_decrease_no_notification(mocker):
    mocker.patch('app.collector.sources.sih2026.SIH2026Source.fetch_all', return_value=[{"ps_id": "SIH26001", "count": 5, "capacity": 500}])
    mocker.patch('app.services.firestore.get_ps', return_value={"ps_id": "SIH26001", "count": 10, "capacity": 500})
    mocker.patch('app.services.firestore.handle_count_decrease')
    mocker.patch('app.services.firestore.update_ps')
    mocker.patch('app.services.firestore.set_collector_status')
    
    mock_fcm = mocker.patch('app.collector.worker.send_ps_notification')
    
    await run_collection_cycle()
    
    mock_fcm.assert_not_called()

@pytest.mark.asyncio
async def test_first_observation_no_notification(mocker):
    mocker.patch('app.collector.sources.sih2026.SIH2026Source.fetch_all', return_value=[{"ps_id": "SIH26001", "count": 10, "capacity": 500}])
    mocker.patch('app.services.firestore.get_ps', return_value=None)
    mocker.patch('app.services.firestore.initialize_ps')
    mocker.patch('app.services.firestore.set_collector_status')
    
    mock_fcm = mocker.patch('app.collector.worker.send_ps_notification')
    
    await run_collection_cycle()
    
    mock_fcm.assert_not_called()
