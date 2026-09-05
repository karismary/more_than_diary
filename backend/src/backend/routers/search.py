import numpy as np
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.schemas import DiarySourceResponse
from backend.services.embedding import OpenAIEmbedder
from backend.services.vector_store import search_vectors
from backend.config import get_settings


router = APIRouter(
    prefix="/search",
    tags=["search"],
)

@router.get(
    "",
    response_model=list[DiarySourceResponse],
)
def search(
    q: str = Query(min_length=1),
    top_k: int = Query(default=5, ge=1, le=20),
    db: Session = Depends(get_db),
) -> list[DiarySourceResponse]:
    embedder = OpenAIEmbedder()

    query_embedding = embedder.embed([q])[0]
    query_vector = np.asarray(query_embedding, dtype=np.float32)

    hits = search_vectors(
        db=db,
        query_vector=query_vector,
        top_k=top_k,
    )
    hits_filtered = []

    threshold = get_settings().similarity_threshold
    for hit in hits:
        if hit.score < threshold:
            break
        elif hit.score >= threshold:
            hits_filtered.append(hit)

    return [
        DiarySourceResponse(
            fragment_id=hit.fragment_id,
            entry_id=hit.entry_id,
            content=hit.content,
            score=hit.score,
        )
        for hit in hits_filtered
    ]