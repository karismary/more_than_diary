# AI 日记助手（Diary RAG）

本项目是一个本地优先的 AI 日记助手：保存日记后自动建立向量索引，并支持基于历史日记的检索问答。

## 目录说明

```text
diary_app/
├── docs/                     # 项目与接入文档
│   ├── DESIGN.md              # 产品与功能设计
│   ├── TECH_DESIGN.md         # 技术、数据与 API 设计
│   └── OLLAMA_API.md          # 局域网 Ollama 调用说明
├── backend/                   # FastAPI / SQLAlchemy 后端
│   ├── src/backend/           # 后端 Python 源码
│   ├── .env.example           # 后端环境变量模板
│   └── pyproject.toml         # Python 依赖与项目配置
├── frontend/                  # Vite / React 前端
│   ├── src/                   # 前端源码
│   └── package.json           # Node.js 依赖与脚本
├── .vscode/                   # VS Code 工作区推荐配置
└── .gitignore                 # Git 忽略规则
```

## 文档导航

- [产品设计](docs/DESIGN.md)
- [技术设计](docs/TECH_DESIGN.md)
- [局域网 Ollama API](docs/OLLAMA_API.md)
- [后端测试指南](docs/TESTING.md)
- [后端说明](backend/README.md)

## 本地配置

后端环境变量模板在 `backend/.env.example`。将其复制为 `backend/.env` 后，按本机 MySQL 和 Ollama 服务填写配置；`.env` 不会提交到 Git。
