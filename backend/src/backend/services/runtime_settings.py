"""从 settings 表读取运行时配置覆盖，供各 service 构造时注入。

覆盖缺失时 service 自动回落 .env（config.Settings）。这里的职责只是：
把数据库里的 AppSetting 行读取成各 service 需要的 keyword 参数。
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.models import AppSetting

# 允许覆盖的 key（白名单，防止前端写入未知配置）
ALLOWED_KEYS = {
    "diary_font",
    "embedding_base_url",
    "embedding_api_key",
    "embedding_model",
    "embedding_dim",
    "llm_base_url",
    "llm_api_key",
    "llm_model",
}

# AppSetting 键 -> OpenAIEmbedder / OpenAIChatModel 的关键字参数名
_EMBED_MAP = {
    "embedding_base_url": "base_url",
    "embedding_api_key": "api_key",
    "embedding_model": "model",
    "embedding_dim": "dim",
}
_LLM_MAP = {
    "llm_base_url": "base_url",
    "llm_api_key": "api_key",
    "llm_model": "model",
}


def load_overrides(db: Session) -> dict[str, str]:
    """读回全部用户覆盖：{key: value}（不含默认值）。"""
    rows = db.execute(select(AppSetting)).scalars().all()
    return {row.key: row.value for row in rows}


def _pick(overrides: dict[str, str], mapping: dict[str, str]) -> dict:
    kwargs: dict[str, object] = {}
    for db_key, param in mapping.items():
        if db_key not in overrides:
            continue
        raw = overrides[db_key]
        if param == "dim":
            kwargs[param] = int(raw)
        else:
            kwargs[param] = raw
    return kwargs


def embed_kwargs(db: Session) -> dict:
    """给 OpenAIEmbedder(...) 的覆盖参数（无覆盖则为空 dict = 用 .env）。"""
    return _pick(load_overrides(db), _EMBED_MAP)


def llm_kwargs(db: Session) -> dict:
    """给 OpenAIChatModel(...) / IntentClassifier(...) 的覆盖参数。"""
    return _pick(load_overrides(db), _LLM_MAP)
