# ai_service/core/internal_api_key.py
import re

MIN_KEY_LENGTH = 32
MAX_KEY_LENGTH = 256
INVALID_KEY_CHARACTER = re.compile(r"[^\x21-\x7e]")


def is_valid_internal_api_key(value: object) -> bool:
    """Use the same unmodified header-safe key format as the backend."""
    return (
        isinstance(value, str)
        and MIN_KEY_LENGTH <= len(value) <= MAX_KEY_LENGTH
        and INVALID_KEY_CHARACTER.search(value) is None
    )
