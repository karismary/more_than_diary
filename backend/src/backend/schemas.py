from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class EntryCreate(BaseModel):
    content: str = Field(min_length=1, max_length=65_535)


class EntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    content: str
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