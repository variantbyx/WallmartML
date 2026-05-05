import pytest

from app.services.retraining import RetrainingService


@pytest.mark.asyncio
async def test_evaluate_retrain_need_flags_high_false_positive_rate():
    service = RetrainingService()
    decision = await service.evaluate_retrain_need(
        {"false_positive_rate": 0.2},
        {"drifted_feature_count": 0, "retrain_recommended": False},
    )

    assert decision.should_retrain is True
    assert decision.reason.startswith("false_positive_rate_exceeded")