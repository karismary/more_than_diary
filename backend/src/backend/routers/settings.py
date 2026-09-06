from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.config import Settings, get_settings
from backend.db import get_db
from backend.models import AppSetting
from backend.schemas import (
    AiTestRequest,
    AiTestResponse,
    SettingsResponse,
    SettingsUpdate,
)
from backend.services.embedding import OpenAIEmbedder
from backend.services.llm import OpenAIChatModel
from backend.services.runtime_settings import ALLOWED_KEYS

router = APIRouter(
    prefix="/settings",
    tags=["settings"],
)

DbSession = Annotated[Session, Depends(get_db)]


def _defaults(settings: Settings) -> dict[str, str | int]:
    return {
        "diary_font": "system",
        "embedding_base_url": settings.embedding_base_url,
        "embedding_api_key": settings.embedding_api_key,
        "embedding_model": settings.embedding_model,
        "embedding_dim": settings.embedding_dim,
        "llm_base_url": settings.llm_base_url,
        "llm_api_key": settings.llm_api_key,
        "llm_model": settings.llm_model,
    }


def _to_int(key: str, value: str) -> str | int:
    return int(value) if key == "embedding_dim" else value


@router.get("", response_model=SettingsResponse)
def read_settings(db: DbSession) -> SettingsResponse:
    rows = db.execute(select(AppSetting)).scalars().all()

    overrides = {
        row.key: _to_int(row.key, row.value)
        for row in rows
        if row.key in ALLOWED_KEYS and row.value != ""
    }

    return SettingsResponse(
        overrides=overrides,
        defaults=_defaults(get_settings()),
    )


@router.put("", response_model=SettingsResponse)
def write_settings(
    payload: SettingsUpdate,
    db: DbSession,
) -> SettingsResponse:
    unknown = set(payload.overrides) - ALLOWED_KEYS
    if unknown:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"未知的设置项：{', '.join(sorted(unknown))}",
        )

    for key, raw_value in payload.overrides.items():
        row = db.get(AppSetting, key)

        if raw_value is None:
            # None 或空串都视为恢复默认：删除覆盖行
            if row is not None:
                db.delete(row)
            continue

        value = str(raw_value).strip()
        if value == "":
            if row is not None:
                db.delete(row)
            continue

        if len(value) > 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"设置项 {key} 过长",
            )

        if row is None:
            db.add(AppSetting(key=key, value=value))
        else:
            row.value = value

    db.commit()

    rows = db.execute(select(AppSetting)).scalars().all()
    overrides = {
        row.key: _to_int(row.key, row.value)
        for row in rows
        if row.key in ALLOWED_KEYS and row.value != ""
    }

    return SettingsResponse(
        overrides=overrides,
        defaults=_defaults(get_settings()),
    )


@router.post("/test", response_model=AiTestResponse)
def test_ai_connection(
    payload: AiTestRequest,
) -> AiTestResponse:
    """用提交的连接参数临时试连一次，不落库。"""
    settings = get_settings()

    try:
        if payload.scope == "embedding":
            embedder = OpenAIEmbedder(
                base_url=payload.base_url,
                api_key=payload.api_key,
                model=payload.model,
                dim=payload.embedding_dim,
            )
            vectors = embedder.embed(["连接测试"])
            actual_dim = len(vectors[0])
            expected = payload.embedding_dim
            if expected is not None and expected != actual_dim:
                return AiTestResponse(
                    ok=False,
                    message=(
                        f"已连上 {embedder.model}，但返回维度 {actual_dim} "
                        f"与你填的 {expected} 不一致。"
                    ),
                )
            return AiTestResponse(
                ok=True,
                message=f"连接成功 · {embedder.model} · 维度 {actual_dim}",
            )

        # scope == "llm"
        chat_model = OpenAIChatModel(
            base_url=payload.base_url,
            api_key=payload.api_key,
            model=payload.model,
        )
        chat_model.client.chat.completions.create(
            model=chat_model.model,
            messages=[{"role": "user", "content": "回复：ok"}],
            max_tokens=5,
        )
        return AiTestResponse(ok=True, message=f"连接成功 · {chat_model.model}")

    except Exception as exc:  # noqa: BLE001 —— 把连接错误原样回给前端展示
        return AiTestResponse(ok=False, message=str(exc) or exc.__class__.__name__)
