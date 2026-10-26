# D:/SWP391/SWP391/ai_service/core/video_recipe_config.py
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

MAX_VIDEO_DURATION_SECONDS = 660
MAX_GROQ_UPLOAD_BYTES = 25_000_000
MAX_PROVIDER_RESPONSE_BYTES = 1_048_576
SAMPLE_RATE = 16_000
MAX_DURATION_DRIFT_SECONDS = 2


class VideoRecipeSettings(BaseSettings):
    """Validate local media tools and provider limits without exposing secrets."""

    model_config = SettingsConfigDict(env_file=Path(__file__).resolve().parents[1] / ".env", extra="ignore")
    groq_api_key: str = Field(default="", repr=False)
    video_ffmpeg_path: str = ""
    video_download_timeout_seconds: float = Field(default=120, gt=0, le=300)
    video_decode_timeout_seconds: float = Field(default=60, gt=0, le=180)
    video_groq_timeout_seconds: float = Field(default=180, gt=0, le=500)
    video_summary_timeout_seconds: float = Field(default=120, gt=0, le=300)
    video_max_download_bytes: int = Field(default=52_428_800, ge=1_048_576, le=104_857_600)


video_recipe_settings = VideoRecipeSettings()
