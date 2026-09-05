# 局域网 Ollama API 使用文档

本文档对应局域网 Ollama 服务：

```text
http://10.138.9.202:11434
```

## 1. 当前可用模型

通过 `GET /api/tags` 实测到：

| 用途 | 模型 | 向量维度 |
| --- | --- | ---: |
| LLM 聊天/生成 | `qwen2.5:3b` | — |
| Embedding | `bge-m3:latest` | 1024 |

模型名必须完整匹配（包括 `:latest`）。如果后续更换模型，以 `/api/tags` 返回值为准。

## 2. 地址、认证与通用约定

- 原生 Ollama API：`http://10.138.9.202:11434/api/...`
- OpenAI 兼容 API：`http://10.138.9.202:11434/v1/...`
- 默认不需要 API Key；客户端若强制要求，可填写任意非空字符串（例如 `ollama`）。
- 请求头通常使用 `Content-Type: application/json`。
- 原生接口默认可能返回 NDJSON 流（每行一个 JSON）；调试或后端一次性读取时设置 `"stream": false`。
- Ollama 运行主机必须允许局域网访问（监听 `0.0.0.0:11434`），客户端与其网络互通。

## 3. 服务检查与模型管理

### 3.1 查看版本

```bash
curl http://10.138.9.202:11434/api/version
```

响应：

```json
{"version":"0.x.y"}
```

### 3.2 查看已安装模型

```bash
curl http://10.138.9.202:11434/api/tags
```

响应核心结构：

```json
{
  "models": [
    {
      "name": "qwen2.5:3b",
      "model": "qwen2.5:3b",
      "size": 2104932919,
      "digest": "...",
      "details": {
        "family": "qwen2",
        "parameter_size": "3.4B",
        "quantization_level": "Q4_K_M"
      },
      "capabilities": ["completion"]
    }
  ]
}
```

### 3.3 查看模型信息

```bash
curl http://10.138.9.202:11434/api/show \
  -H 'Content-Type: application/json' \
  -d '{"name":"qwen2.5:3b"}'
```

### 3.4 拉取、复制、删除模型

```bash
# 拉取（响应为流式进度 JSON）
curl http://10.138.9.202:11434/api/pull \
  -d '{"model":"qwen2.5:3b","stream":false}'

# 复制
curl http://10.138.9.202:11434/api/copy \
  -d '{"source":"qwen2.5:3b","destination":"qwen2.5:3b-diary"}'

# 删除（不可恢复，请确认模型名）
curl -X DELETE http://10.138.9.202:11434/api/delete \
  -d '{"model":"qwen2.5:3b-diary"}'
```

## 4. LLM 调用（原生 Ollama API）

### 4.1 推荐：`/api/chat`

适合 Diary RAG：可传入 system 约束、检索上下文和用户问题。

```bash
curl http://10.138.9.202:11434/api/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "qwen2.5:3b",
    "messages": [
      {"role":"system","content":"只能依据提供的日记上下文回答；找不到依据时明确说明。"},
      {"role":"user","content":"日记上下文：\n2026-08-30：傍晚去滨江跑了五公里。\n\n问题：我最近做过什么运动？"}
    ],
    "stream": false,
    "options": {"temperature": 0.2, "num_ctx": 8192}
  }'
```

响应（`stream:false`）：

```json
{
  "model":"qwen2.5:3b",
  "created_at":"2026-09-02T01:00:00Z",
  "message":{"role":"assistant","content":"你最近在滨江跑了五公里。"},
  "done":true,
  "prompt_eval_count":123,
  "eval_count":18,
  "total_duration":123456789
}
```

取回答文本：`response.message.content`。

### 4.2 单轮文本生成：`/api/generate`

不需要多轮消息时使用：

```bash
curl http://10.138.9.202:11434/api/generate \
  -d '{
    "model":"qwen2.5:3b",
    "system":"你是日记助手，只根据上下文回答。",
    "prompt":"上下文：今天读了《百年孤独》。\n问题：我今天读了什么？",
    "stream":false,
    "options":{"temperature":0.2}
  }'
```

取回答文本：`response.response`。

### 4.3 流式响应处理

省略 `stream:false` 或设置为 `true` 时，响应是 NDJSON：

```text
{"message":{"role":"assistant","content":"你"},"done":false}
{"message":{"role":"assistant","content":"最近"},"done":false}
{"message":{"role":"assistant","content":"跑了五公里。"},"done":true}
```

逐行解析 JSON，并拼接 `message.content`；不要把整个响应当作一个 JSON 解析。

## 5. Embedding 调用（原生 Ollama API）

### 5.1 推荐：`/api/embed`（支持批量）

```bash
curl http://10.138.9.202:11434/api/embed \
  -H 'Content-Type: application/json' \
  -d '{
    "model":"bge-m3:latest",
    "input":["今天傍晚去滨江跑了五公里。","我最近开始规律运动。"]
  }'
```

响应：

```json
{
  "model":"bge-m3:latest",
  "embeddings":[[0.0123,-0.0456,0.0789], [0.0111,-0.0444,0.0777]],
  "total_duration":9876543,
  "load_duration":123456
}
```

实际每个向量长度为 **1024**。`input` 可以是字符串或字符串数组；RAG 建议批量传数组。

### 5.2 旧版兼容接口：`/api/embeddings`

若服务版本不支持 `/api/embed`，使用单条请求：

```bash
curl http://10.138.9.202:11434/api/embeddings \
  -d '{"model":"bge-m3:latest","prompt":"今天傍晚去滨江跑了五公里。"}'
```

响应：`{"embedding":[...1024 个浮点数...]}`。新代码优先使用 `/api/embed`。

### 5.3 向量保存与相似度

- 将返回数组转换为 `float32` 后保存；维度写入 `dim=1024`。
- 查询时使用同一个 embedding 模型，不能混用不同维度或不同模型的向量。
- 余弦相似度：`dot(query, doc) / (norm(query) * norm(doc))`。

## 6. OpenAI-compatible 调用方式（适配现有设计）

项目设计中的 `LLM_BASE_URL` / `EMBEDDING_BASE_URL` 可直接指向 `/v1`：

```dotenv
LLM_BASE_URL=http://10.138.9.202:11434/v1
LLM_API_KEY=ollama
LLM_MODEL=qwen2.5:3b

EMBEDDING_BASE_URL=http://10.138.9.202:11434/v1
EMBEDDING_API_KEY=ollama
EMBEDDING_MODEL=bge-m3:latest
EMBEDDING_DIM=1024
```

### 6.1 `/v1/chat/completions`

```bash
curl http://10.138.9.202:11434/v1/chat/completions \
  -H 'Authorization: Bearer ollama' \
  -H 'Content-Type: application/json' \
  -d '{
    "model":"qwen2.5:3b",
    "messages":[
      {"role":"system","content":"只能依据日记上下文回答。"},
      {"role":"user","content":"问题：我最近做过什么？\n上下文：……"}
    ],
    "temperature":0.2,
    "stream":false
  }'
```

取回答文本：`choices[0].message.content`。

### 6.2 `/v1/embeddings`

```bash
curl http://10.138.9.202:11434/v1/embeddings \
  -H 'Authorization: Bearer ollama' \
  -H 'Content-Type: application/json' \
  -d '{
    "model":"bge-m3:latest",
    "input":["今天傍晚去滨江跑了五公里。","我最近开始规律运动。"]
  }'
```

响应结构：

```json
{
  "object":"list",
  "data":[
    {"object":"embedding","index":0,"embedding":[0.0123,-0.0456]},
    {"object":"embedding","index":1,"embedding":[0.0111,-0.0444]}
  ],
  "model":"bge-m3:latest",
  "usage":{"prompt_tokens":0,"total_tokens":0}
}
```

实际向量仍为 1024 维；按 `index` 排序后取 `data[*].embedding`。

Python（OpenAI SDK）示例：

```python
from openai import OpenAI

client = OpenAI(base_url="http://10.138.9.202:11434/v1", api_key="ollama")
chat = client.chat.completions.create(
    model="qwen2.5:3b",
    messages=[{"role": "user", "content": "你好"}],
    temperature=0.2,
)
print(chat.choices[0].message.content)

vectors = client.embeddings.create(
    model="bge-m3:latest",
    input=["第一段日记", "第二段日记"],
)
print(len(vectors.data[0].embedding))  # 1024
```

## 7. 项目接入建议

1. 启动时调用 `/api/tags`，检查两个模型是否存在；不存在时提示先执行 `ollama pull`。
2. 日记切片后调用 `/api/embed` 批量生成向量，写入 `vectors.embedding`、`dim=1024`、`model=bge-m3:latest`。
3. `/api/ask` 先用问题向量检索，再将命中片段拼入 `/api/chat` 的 system/user messages。
4. LLM 温度建议 `0.1~0.3`；上下文长度通过 `options.num_ctx` 控制，并限制检索片段总字符数。
5. 网络异常、模型未找到、超时和非 2xx 响应都应转换为后端统一错误 `{ "detail": "..." }`。

## 8. 常见错误排查

```bash
# 服务是否可达
curl -i --max-time 5 http://10.138.9.202:11434/api/tags

# 模型名是否正确
curl -s http://10.138.9.202:11434/api/tags | jq '.models[].name'
```

- `connection refused/timeout`：确认 Ollama 监听局域网地址、防火墙和端口 `11434`。
- `404 model not found`：模型名必须与 `/api/tags` 完全一致。
- 向量维度不一致：清理并重建旧向量，确保全部使用 `bge-m3:latest`（1024 维）。
- 返回乱码或 JSON 解析失败：原生接口的流式响应需按 NDJSON 逐行解析，或设置 `stream:false`。
- `/v1` 兼容接口不可用：改用原生 `/api/chat` 与 `/api/embed`，或升级 Ollama。

