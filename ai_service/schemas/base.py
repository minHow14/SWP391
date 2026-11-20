# D:/SWP391/SWP391/ai_service/schemas/base.py
# Model Pydantic gốc dùng chung cho mọi schema của AI Service.
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


# Lớp cơ sở: tự sinh alias camelCase cho JSON; extra="forbid" để từ chối trường lạ thay vì bỏ qua âm thầm.
class CamelModel(BaseModel):
    """Giữ snake_case nội bộ và dùng camelCase tại biên HTTP/JSON."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
        extra="forbid",
    )
