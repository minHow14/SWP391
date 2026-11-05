# D:/SWP391/SWP391/ai_service/core/video_recipe_config.py
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

MAX_VIDEO_DURATION_SECONDS = 660
MAX_CAPTION_RESPONSE_BYTES = 4_194_304
MAX_CAPTION_SEGMENTS = 2000
CAPTION_READ_TIMEOUT_SECONDS = 5


class VideoRecipeSettings(BaseSettings):
    """Validate caption retrieval and recipe provider deadlines."""

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[1] / ".env", extra="ignore"
    )
    video_captions_timeout_seconds: float = Field(default=30, gt=0, le=120)
    video_summary_timeout_seconds: float = Field(default=120, gt=0, le=300)


video_recipe_settings = VideoRecipeSettings()
