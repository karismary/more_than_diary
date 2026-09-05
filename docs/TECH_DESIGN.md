# Diary RAG 技术设计文档

本文档描述 Diary RAG 的技术选型、目录结构、数据库设计、API 设计和核心实现思路，作为前后端开发的约定。

## 1. 技术选型

| 层 | 选型 | 说明 |
| --- | --- | --- |
| 前端 | Vite + React + JavaScript | 已搭好 demo 骨架 |
| 图标 | lucide-react | 与现有 demo 保持一致 |
| 后端 | FastAPI + Uvicorn | Python 3.12，异步优先 |
| ORM | SQLAlchemy 2.0 | 统一访问 MySQL |
| MySQL 驱动 | PyMySQL | 纯 Python 驱动，本地够用 |
| 配置 | pydantic-settings | 从环境变量读取配置 |
| 数据库 | MySQL | 本机 MySQL Community Server，UTF-8 |
| 向量存储 | MySQL `BLOB` + NumPy 余弦相似度 | MVP 不引入独立向量数据库 |
| Embedding | OpenAI-compatible 免费 API | 适配层隔离 |
| LLM | OpenAI-compatible 免费 API | 适配层隔离 |
| 包管理 | uv | 负责 Python 环境和依赖 |

### 向量存储策略

MVP 直接用 MySQL 保存 `float32` 向量字节，检索时用 NumPy 计算余弦相似度：

```text
similarity = dot(query, doc) / (norm(query) * norm(doc))
```

理由：

- 日记量级在个人使用场景下通常很小，MySQL 内存检索足够快。
- 不需要启动 Elasticsearch、Milvus、Qdrant 等额外服务。
- 用 `VectorStore` 接口把细节藏起来，后续可平滑替换为 FAISS、hnswlib 或 MySQL 原生向量。

## 2. 目录结构（目标形态）

```text
diary_app/
├── README.md
├── docs/
│   ├── DESIGN.md
│   ├── TECH_DESIGN.md
│   └── OLLAMA_API.md
├── backend/
│   ├── .python-version
│   ├── pyproject.toml
│   ├── uv.lock
│   ├── .env.example
│   └── src/backend/
│       ├── main.py              # FastAPI 入口
│       ├── config.py            # pydantic-settings
│       ├── db.py                # engine / session
│       ├── models.py            # SQLAlchemy 模型
│       ├── schemas.py           # Pydantic 请求/响应
│       ├── routers/
│       │   ├── entries.py
│       │   ├── ask.py
│       │   └── index.py
│       └── services/
│           ├── chunker.py       # 文本切分
│           ├── embedding.py     # Embedding 适配层
│           ├── vector_store.py  # 向量存储与检索
│           ├── llm.py           # LLM 适配层
│           └── indexing.py      # 索引任务
└── frontend/
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── mock.js              # demo 数据，联调后替换
        ├── api.js               # 待加：FastAPI 客户端
        └── components/
            ├── WriteView.jsx
            ├── DiaryView.jsx
            ├── AskView.jsx
            └── IndexView.jsx
```

## 3. 数据库设计

数据库名：`diary_app`，字符集 `utf8mb4`。

MySQL 不是项目目录里的单个文件，而是本机的一个服务；数据默认由 MySQL 实例管理。SQLite 时代“一个 db 文件”的心智模型需要换成“连接一个本机服务”。

### 3.1 entries：日记

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | BIGINT UNSIGNED PK AUTO_INCREMENT | 主键 |
| content | TEXT NOT NULL | 纯文本正文 |
| created_at | DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) | 保存时间 |
| updated_at | DATETIME(6) ON UPDATE CURRENT_TIMESTAMP(6) | 更新时间 |

### 3.2 fragments：文本片段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | BIGINT UNSIGNED PK AUTO_INCREMENT | 主键 |
| entry_id | BIGINT UNSIGNED NOT NULL | 所属日记，外键 |
| seq | INT NOT NULL | 片段顺序 |
| content | TEXT NOT NULL | 片段原文 |
| created_at | DATETIME(6) | 入库时间 |

索引：`UNIQUE (entry_id, seq)`，外键 `entry_id → entries.id ON DELETE CASCADE`。

### 3.3 vectors：向量记录

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | BIGINT UNSIGNED PK AUTO_INCREMENT | 主键 |
| fragment_id | BIGINT UNSIGNED NOT NULL | 对应片段，唯一 |
| embedding | BLOB NOT NULL | `float32` 向量字节 |
| dim | SMALLINT UNSIGNED NOT NULL | 向量维度 |
| model | VARCHAR(128) NOT NULL | 生成该向量的模型名 |
| indexed_at | DATETIME(6) | 索引完成时间 |

索引：`UNIQUE (fragment_id)`，外键 `fragment_id → fragments.id ON DELETE CASCADE`。

### 3.4 index_jobs：索引任务

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | BIGINT UNSIGNED PK AUTO_INCREMENT | 主键 |
| type | VARCHAR(32) NOT NULL | incremental / rebuild |
| status | VARCHAR(32) NOT NULL | pending / running / done / failed |
| total_count | INT | 总任务数 |
| done_count | INT | 已完成数 |
| error | TEXT NULL | 失败原因 |
| started_at / finished_at | DATETIME(6) NULL | 起止时间 |

## 4. 核心服务设计

### 4.1 Chunker：文本切分

- 按段落/换行拆分，再把过长的段落按字符长度二次切分。
- 保留 `seq`、`char_start`、`char_end`，便于未来高亮定位。
- 建议默认值：单片段 200 字符、重叠 20 字符（先用 demo 数据实测，再调优）。
- 超短日记直接作为单个 chunk，不做无意义拆分。

### 4.2 Embedder：Embedding 适配层

```python
class Embedder(Protocol):
    model: str
    dim: int

    def embed(self, texts: list[str]) -> list[list[float]]: ...
```

具体实现读取：

```text
EMBEDDING_BASE_URL
EMBEDDING_API_KEY
EMBEDDING_MODEL
EMBEDDING_DIM
```

只依赖 OpenAI-compatible 的 `/embeddings` 接口形状，具体供应商后续替换时无需改动上层。

### 4.3 VectorStore：向量存储与检索

```python
class VectorStore(Protocol):
    def upsert(self, fragment_id: int, embedding: list[float], model: str) -> None: ...
    def delete_by_entry(self, entry_id: int) -> None: ...
    def search(self, query: list[float], top_k: int) -> list[SearchHit]: ...
```

- `mysql_numpy` 实现：读取全部向量到 NumPy，归一化后矩阵乘法算余弦相似度。
- `SearchHit` 返回 `fragment_id`、`entry_id`、`content`、`score`。
- 未来若数据量变大，实现 FAISS/hnswlib 版本即可，接口不变。

### 4.4 LLM：回答生成

```python
class ChatModel(Protocol):
    def complete(self, system: str, user: str) -> str: ...
```

系统提示固定约束 LLM：

- 只能依据给定的日记上下文回答。
- 如果上下文与问题无关，明确说明没有找到相关内容。
- 回答保持简洁，尽量引用具体日期。

### 4.5 Indexing：索引任务

- 保存日记后创建 `incremental` 任务，后台逐个 chunk 处理。
- 处理前先按 `(entry_id, seq)` 去重，重复运行不产生重复向量。
- 单条失败时记录错误并继续，任务状态标记为 `failed`。
- `rebuild` 任务先清理全部 `fragments` / `vectors`，再按正文重放。

## 5. API 设计

统一前缀：`/api`。错误响应统一为 `{ "detail": "..." }`。

### 5.1 日记

`POST /api/entries`

```json
{ "content": "今天傍晚去滨江跑了五公里。" }
```

返回：

```json
{
  "id": 1,
  "content": "今天傍晚去滨江跑了五公里。",
  "created_at": "2026-08-30T20:10:00"
}
```

`GET /api/entries?limit=20&offset=0`：分页列表，按 `created_at` 倒序。

`GET /api/entries/{id}`：单篇详情。

`DELETE /api/entries/{id}`：删除日记，并级联清理 fragments / vectors。

### 5.2 AI 问答

`POST /api/ask`

```json
{ "question": "我去年夏天做过什么？" }
```

返回：

```json
{
  "answer": "根据日记，去年 8 月你傍晚在滨江跑了五公里……",
  "found": true,
  "sources": [
    { "entry_id": 1, "date": "2026-08-02", "title": "今天傍晚去滨江…", "score": 0.78 }
  ]
}
```

未命中时：

```json
{
  "answer": "没有找到相关日记",
  "found": false,
  "sources": []
}
```

### 5.3 检索调试

`GET /api/search?q=文本&top_k=8`：返回原始命中，不经过 LLM，方便调试阈值和切分效果。

### 5.4 索引控制

`GET /api/index/status`：返回任务概览和最近任务列表。

`POST /api/index/rebuild`：创建全量重建任务。

## 6. 提问链路细节

1. 对问题调用 `embed([question])`，得到查询向量。
2. `VectorStore.search(query, top_k=8)` 返回候选片段。
3. 对候选按相似度过滤，低于 `SEARCH_MIN_SCORE` 的丢弃。
4. 保留最高分 3-5 个片段，拼接为上下文，附上日期。
5. 调用 `ChatModel.complete` 生成回答。
6. 返回回答与来源；无候选时直接返回“没有找到相关日记”。

阈值建议先设为 `0.35`，等真实 Embedding 选型后根据样例调优，不应作为固定结论。

## 7. 配置示例

`backend/.env.example`：

```dotenv
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=diary
MYSQL_PASSWORD=change-me
MYSQL_DATABASE=diary_app

EMBEDDING_BASE_URL=
EMBEDDING_API_KEY=
EMBEDDING_MODEL=
EMBEDDING_DIM=768

LLM_BASE_URL=
LLM_API_KEY=
LLM_MODEL=

SEARCH_TOP_K=8
SEARCH_MIN_SCORE=0.35
VECTOR_STORE=mysql_numpy
```

开发阶段如使用本机 root 账号，仅把 `.env.example` 复制为 `.env` 并填入本机值；后续建议创建专用账号 `diary`。

## 8. 本地开发命令

### 8.1 MySQL

```bash
# 启动本机 MySQL 服务
sudo /usr/local/mysql/support-files/mysql.server start

# 检查状态
mysqladmin -u root -p ping

# 建库（幂等）
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS diary_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 8.2 后端

```bash
cd backend
uv sync
cp .env.example .env
uv run uvicorn backend.main:app --reload
```

后端地址：`http://127.0.0.1:8000`，交互文档：`http://127.0.0.1:8000/docs`。

### 8.3 前端

```bash
cd frontend
npm install
npm run dev
```

前端地址：`http://localhost:5173/`。

## 9. 当前纯前端 demo 与迁移路径

已经完成的 demo 验证了页面形态和交互，但数据全部来自 `frontend/src/mock.js`：

- 日记存在 `localStorage`。
- AI 问答用关键词规则模拟，不调用真实向量库。
- 索引状态是静态统计，不执行真实任务。

进入 M1 后，新增 `frontend/src/api.js` 封装 FastAPI 调用，并让 `App.jsx` 通过“数据层接口”从 mock 切换为真实 API，组件尽量少改动。

## 10. 待定与风险

- 免费 Embedding/LLM API 的额度、限流和稳定性需要实测，模型与维度会随选型变化。
- 中文日记的切分策略和相似度阈值需要用真实日记样本调优。
- NumPy 全量扫描在个人数据量下足够；如果未来增长明显，再评估 FAISS/hnswlib 或 MySQL 原生向量。
- 后端需要补充统一异常处理和日志，索引任务后续可用 asyncio 任务或轻量后台线程实现。
