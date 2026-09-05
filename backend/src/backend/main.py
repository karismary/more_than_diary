from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI

from backend.db import init_db
from backend.routers.entries import router as entries_router
from backend.routers.search import router as search_router
from backend.routers.ask import router as ask_router


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    init_db()
    yield


app = FastAPI(
    title="Diary RAG API",
    version="0.1.0",
    lifespan=lifespan,
)
app.include_router(entries_router, prefix="/api")
app.include_router(search_router, prefix="/api")
app.include_router(ask_router, prefix="/api")

@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}