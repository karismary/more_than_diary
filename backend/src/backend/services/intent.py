from enum import Enum

from pydantic import BaseModel
from backend.config import get_settings
from openai import OpenAI
from datetime import datetime
import json


class Intent(str, Enum):
    MEMORY = "memory"
    SUMMARY = "summary"
    INSPIRATION = "inspiration"
    EMOTION = "emotion"
    PLAN = "plan"
    CHAT = "chat"


class IntentResult(BaseModel):
    intent: Intent

    @property
    def needs_diary(self) -> bool:
        return self.intent in {
            Intent.MEMORY,
            Intent.SUMMARY,
            Intent.INSPIRATION,
            Intent.EMOTION,
            Intent.PLAN,
        }

class IntentClassifier:
    """意图分类（走 LLM）。传入可选覆盖，None 则回落 .env 配置。"""

    def __init__(
        self,
        *,
        base_url: str | None = None,
        api_key: str | None = None,
        model: str | None = None,
    ) -> None:
        settings = get_settings()

        self.model = model or settings.llm_model
        self.client = OpenAI(
            base_url=base_url or settings.llm_base_url,
            api_key=api_key or settings.llm_api_key,
        )

    def classify(self, question: str) -> IntentResult:
        model = self.model
        response = self.client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "你负责判断用户问题的意图。"
                        "只能从以下六个类别中选择一个："
                        "memory、summary、inspiration、emotion、plan、chat。"
                        "\n"
                        "分类规则："
                        "\n"
                        "memory：回忆过去发生的具体事情，或查找某个事实。"
                        "例如：我上个月什么时候去徒步的？"
                        "\n"
                        "summary：总结用户一段时间的生活、经历或记录。"
                        "例如：总结一下我最近的生活。"
                        "\n"
                        "inspiration：根据用户的生活或日记，提供写日记的主题、角度或问题。"
                        "例如：给我一些今天写日记的灵感。"
                        "\n"
                        "emotion：分析用户近期的情绪、压力、状态或变化。"
                        "例如：我最近是不是压力很大？"
                        "\n"
                        "plan：询问用户过去记录过的计划、待办或打算。"
                        "例如：我之前计划整理什么？"
                        "\n"
                        "chat：与用户日记无关的普通聊天、知识问答或创作。"
                        "例如：给我讲一个科幻故事。"
                        "\n"
                        "注意："
                        "询问过去发生的事情属于 memory，不属于 plan。"
                        "只有涉及打算、计划、准备、待办时，才属于 plan。"
                        "只有请求写日记灵感时，才属于 inspiration。"
                        "普通故事创作属于 chat。"
                        "只返回 JSON，不要返回解释或 Markdown 代码块。"
                        f"当前时间为{datetime.now()}，请根据当前时间判断用户问题的意图。"
                        '格式：{"intent": "memory"}'
                    ),
                },
                {
                    "role": "user",
                    "content": f"问题：{question}",
                },
            ],
            response_format={"type": "json_object"},
            temperature=0.0
        )
        content = response.choices[0].message.content

        if content is None:
            raise ValueError("Intent model returned empty content")

        result = json.loads(content).get("intent")

        return IntentResult(intent=result)