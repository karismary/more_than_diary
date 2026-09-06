import numpy as np
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.config import get_settings
from backend.db import get_db
from backend.services.embedding import OpenAIEmbedder
from backend.services.llm import OpenAIChatModel
from backend.services.vector_store import search_vectors
from backend.services.entry_store import (
    build_entries_context,
    get_recent_entries,
)
from backend.schemas import (
    AskRequest,
    AskResponse,
    DiarySourceResponse,
)
from backend.services.intent import Intent, IntentClassifier
from backend.services.runtime_settings import embed_kwargs, llm_kwargs

router = APIRouter(
    prefix="/ask",
    tags=["ask"],
)

DbSession = Annotated[Session, Depends(get_db)]

@router.post(
    "",
    response_model=AskResponse,
)
def ask(
    payload: AskRequest,
    db: DbSession,
) -> AskResponse:
    classifier = IntentClassifier(**llm_kwargs(db))
    intent_result = classifier.classify(payload.question)

    if intent_result.intent == Intent.SUMMARY:
        entries = get_recent_entries(db=db, limit=10)
        context = build_entries_context(entries)
        sources = [
            DiarySourceResponse(
                entry_id=entry.id,
                content=entry.content,
            )
            for entry in entries
        ]

    elif intent_result.needs_diary:
        embedder = OpenAIEmbedder(**embed_kwargs(db))
        query_embedding = embedder.embed([payload.question])[0]
        query_vector = np.asarray(query_embedding, dtype=np.float32)

        hits = search_vectors(
            db=db,
            query_vector=query_vector,
            top_k=10,
        )

        threshold = get_settings().similarity_threshold
        hits = [
            hit
            for hit in hits
            if hit.score >= threshold
        ]

        context = "\n\n".join(
            f"[日记片段 {index}]\n{hit.content}"
            for index, hit in enumerate(hits, start=1)
        )

        sources = [
            DiarySourceResponse(
                fragment_id=hit.fragment_id,
                entry_id=hit.entry_id,
                content=hit.content,
                score=hit.score,
            )
            for hit in hits
        ]

    else:
        context = ""
        sources = []

    chat_model = OpenAIChatModel(**llm_kwargs(db))
    answer = chat_model.generate(
        question=payload.question,
        context=context,
    )

    return AskResponse(
        answer=answer,
        sources=sources,
    )