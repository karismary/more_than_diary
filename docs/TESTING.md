# Diary RAG 后端测试指南

本文档用于验证 Diary RAG 后端 MVP。测试需要本地后端服务、MySQL 和 Ollama 都已配置完成。

## 1. 启动服务

请在 `backend` 目录中运行，这样 Pydantic 才能加载 `backend/.env`。

```bash
cd backend
UV_CACHE_DIR=/tmp/diary-app-uv-cache uv run uvicorn backend.main:app --reload
```

可以访问 `http://127.0.0.1:8000/docs`，通过 Swagger 页面交互式地查看和调用接口。

下面的命令应在另一个终端中执行。
从第 3 步开始到第 10 步清理结束，请使用同一个终端，保证 `$TEST_ENTRY_ID` 变量仍然存在。

## 2. 健康检查

```bash
curl -s http://127.0.0.1:8000/health \
  | python3 -c 'import json, sys; print(json.dumps(json.load(sys.stdin), ensure_ascii=False, indent=2))'
```

预期结果：

```json
{
  "status": "ok"
}
```

## 3. 创建一篇临时测试日记

该请求会同时检查日记写入、文本切分、Embedding 生成和向量保存。

```bash
TEST_ENTRY_ID=$(curl -s -X POST http://127.0.0.1:8000/api/entries \
  -H "Content-Type: application/json" \
  -d '{"content":"测试日记：今天我在滨江公园散步，带了一个蓝色水杯。傍晚下了一点小雨，但我仍然觉得很放松。"}' \
  | python3 -c 'import json, sys; print(json.load(sys.stdin)["id"])')

echo "创建的测试日记 ID: $TEST_ENTRY_ID"
```

预期结果：输出一个数字 ID。如果请求失败，先检查 `backend/.env` 中的 MySQL 和 Ollama 配置。

## 4. 测试日记接口

读取刚刚创建的日记：

```bash
curl -s "http://127.0.0.1:8000/api/entries/$TEST_ENTRY_ID" \
  | python3 -c 'import json, sys; print(json.dumps(json.load(sys.stdin), ensure_ascii=False, indent=2))'
```

查看最近的日记：

```bash
curl -s "http://127.0.0.1:8000/api/entries?limit=5&offset=0" \
  | python3 -c 'import json, sys; print(json.dumps(json.load(sys.stdin), ensure_ascii=False, indent=2))'
```

预期结果：两个响应都应包含测试日记及其原始内容。

## 5. 测试向量检索

```bash
curl -s "http://127.0.0.1:8000/api/search?q=%E6%BB%A8%E6%B1%9F%E5%85%AC%E5%9B%AD&top_k=5" \
  | python3 -c 'import json, sys; print(json.dumps(json.load(sys.stdin), ensure_ascii=False, indent=2))'
```

预期结果：第一条结果应包含“滨江公园”，并带有非空的 `fragment_id` 和 `score`。

## 6. 测试普通聊天

```bash
curl -s -X POST http://127.0.0.1:8000/api/ask \
  -H "Content-Type: application/json" \
  -d '{"question":"给我讲一个科幻故事。"}' \
  | python3 -c 'import json, sys; print(json.dumps(json.load(sys.stdin), ensure_ascii=False, indent=2))'
```

预期结果：`answer` 包含故事，`sources` 是空列表。这说明 `chat` 意图不会检索日记。

## 7. 测试日记回忆

```bash
curl -s -X POST http://127.0.0.1:8000/api/ask \
  -H "Content-Type: application/json" \
  -d '{"question":"我的测试日记里去哪里散步了？"}' \
  | python3 -c 'import json, sys; print(json.dumps(json.load(sys.stdin), ensure_ascii=False, indent=2))'
```

预期结果：回答中应出现“滨江公园”。`sources` 至少有一项带非空的 `fragment_id` 和 `score`。

## 8. 测试最近日记总结

```bash
curl -s -X POST http://127.0.0.1:8000/api/ask \
  -H "Content-Type: application/json" \
  -d '{"question":"总结一下我最近的生活。"}' \
  | python3 -c 'import json, sys; print(json.dumps(json.load(sys.stdin), ensure_ascii=False, indent=2))'
```

预期结果：`sources` 包含完整日记。它们的 `fragment_id` 和 `score` 应为 `null`，因为该流程直接读取最近的 `Entry`，而不是向量片段。

## 9. 测试参数校验

空查询必须返回 HTTP 422：

```bash
curl -i "http://127.0.0.1:8000/api/search?q="
```

不存在的日记 ID 必须返回 HTTP 404：

```bash
curl -i http://127.0.0.1:8000/api/entries/999999999
```

## 10. 清理测试数据

测试完成后删除临时日记：

```bash
curl -i -X DELETE "http://127.0.0.1:8000/api/entries/$TEST_ENTRY_ID"
```

预期结果：HTTP 204。后端会依次删除这篇日记对应的向量、文本片段和日记记录。
