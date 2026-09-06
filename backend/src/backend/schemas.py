from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class EntryCreate(BaseModel):
    content: str = Field(min_length=1, max_length=65_535)
    mood: str | None = Field(default=None, max_length=32)
    place: str | None = Field(default=None, max_length=64)
    weather: str | None = Field(default=None, max_length=32)


class EntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content: str
    mood: str | None = None
    place: str | None = None
    weather: str | None = None
    created_at: datetime
    updated_at: datetime

class DiarySourceResponse(BaseModel):
    entry_id: int
    content: str
    fragment_id: int | None = None
    score: float | None = None

class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2_000)


class AskResponse(BaseModel):
    answer: str
    sources: list[DiarySourceResponse]

class SettingsResponse(BaseModel):
    """overrides = 用户在数据库里覆盖的值；defaults = .env / 内置默认。"""
    overrides: dict[str, str | int]
    defaults: dict[str, str | int]

class SettingsUpdate(BaseModel):
    """key -> 新值；None 表示恢复默认（删除覆盖）。"""
    overrides: dict[str, str | int | None]

class AiTestRequest(BaseModel):
    scope: Literal["embedding", "llm"]
    base_url: str | None = None
    api_key: str | None = None
    model: str | None = None
    embedding_dim: int | None = Field(default=None, ge=1, le=16384)

class AiTestResponse(BaseModel):
    ok: bool
    message: str