# ai_service/tests/test_internal_api_key.py
import pytest
from pydantic import ValidationError

from core.config import Settings
from core.internal_api_key import is_valid_internal_api_key


@pytest.mark.parametrize("length", [32, 64, 256])
def test_accepts_exact_printable_ascii_key_without_normalizing(length):
    key = "A" * (length - 4) + "!_-~"
    config = Settings(_env_file=None, INTERNAL_API_KEY=key)
    assert config.INTERNAL_API_KEY == key
    assert key not in repr(config)


@pytest.mark.parametrize("key", [
    None, "", "A" * 31, "A" * 257,
    " " + "A" * 32, "A" * 32 + " ", "A" * 32 + "\n", "A" * 32 + "\t",
    "A" * 32 + "\r", "A" * 32 + "\0", "A" * 32 + "\x7f", "A" * 32 + "é", "A" * 32 + "đ",
])
def test_rejects_malformed_key_without_exposing_input(key):
    assert is_valid_internal_api_key(key) is False
    with pytest.raises(ValidationError) as caught:
        Settings(_env_file=None, INTERNAL_API_KEY=key)
    if isinstance(key, str) and len(key) >= 32:
        assert key not in str(caught.value)


def test_missing_configuration_has_no_default_key(monkeypatch):
    monkeypatch.delenv("INTERNAL_API_KEY")
    with pytest.raises(ValidationError):
        Settings(_env_file=None)
