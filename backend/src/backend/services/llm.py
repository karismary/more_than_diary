from openai import OpenAI

from backend.config import get_settings


class OpenAIChatModel:
    """OpenAI 兼容的 chat 客户端。传入可选覆盖，None 则回落 .env 配置。"""

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

    def generate(
        self,
        question: str,
        context: str,
    ) -> str:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "你是一个通用的、可以进行天马行空对话的 AI 日记助手。"
                        "如果提供了日记上下文，优先使用其中的内容回答与用户记忆相关的问题。"
                        "日记上下文只代表用户真实记录，不能编造上下文中没有的个人经历。"
                        "如果没有相关日记，可以直接进行普通问答、提供建议、创作灵感或陪伴式对话。"
                        "当你谈论用户的个人经历时，必须明确区分日记中的事实和你的推测。"
                        "如果日记上下文中明确包含答案，必须优先依据日记上下文回答。"
                        "不能因为问题中的时间范围与日记日期表达不同，就否定上下文中的明确事实。"
                        "只有上下文没有相关信息时，才能说没有找到记录。"
                    ),
                },
                {
                    "role": "user",
                    "content": f"日记上下文：\n{context}\n\n问题：{question}",
                },
            ],
            temperature=0.0,
        )

        return response.choices[0].message.content or ""
