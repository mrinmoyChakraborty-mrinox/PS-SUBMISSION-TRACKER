import pytest
from app.collector.worker import run_collection_cycle

@pytest.mark.asyncio
async def test_worker_graceful_failure(mocker):
    mocker.patch('app.collector.sources.sih2026.SIH2026Source.fetch_all', side_effect=Exception("Source is down"))
    mock_set_status = mocker.patch('app.services.firestore.set_collector_status')
    
    await run_collection_cycle()
    
    # Verify that it gracefully handles the error and logs it to set_collector_status
    mock_set_status.assert_called_once()
    args, kwargs = mock_set_status.call_args
    assert args[0] == "error"
    assert "Source is down" in args[2]
