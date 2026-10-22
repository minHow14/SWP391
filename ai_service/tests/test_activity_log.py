# D:/SWP391/SWP391/ai_service/tests/test_activity_log.py
import logging

import pytest

from core.activity_log import record_ai_log


@pytest.mark.asyncio
async def test_operational_logs_do_not_disclose_provider_error_details(caplog):
    with caplog.at_level(logging.INFO):
        await record_ai_log("provider-model", "CHAT_ERROR", "ERROR", "PRIVATE_PROVIDER_DETAIL")
    assert "CHAT_ERROR" in caplog.text
    assert "PRIVATE_PROVIDER_DETAIL" not in caplog.text


def test_ai_configuration_has_no_database_or_jwt_fields():
    from core.config import Settings
    forbidden = {"DATABASE_URL", "SQLITE_FALLBACK_PATH", "DB_PASSWORD", "JWT_SECRET", "JWT_ALGORITHM"}
    assert forbidden.isdisjoint(Settings.model_fields)
