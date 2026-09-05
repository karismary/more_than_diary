import numpy as np
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.models import Fragment, Vector
from backend.services.embedding import bytes_to_vector

@dataclass
class SearchHit:
    fragment_id: int
    entry_id: int
    content: str
    score: float

def cosine_similarity(
    query: np.ndarray,
    document: np.ndarray,
) -> float:
    if query.shape != document.shape:
        raise ValueError(
            f"Query and document must have the same shape, "
            f"got {query.shape} and {document.shape}"
        )
    if query.size == 0 or document.size == 0:
        raise ValueError("Query and document must not be empty")
    
    dot_product = np.dot(query, document)
    query_norm = np.linalg.norm(query)
    document_norm = np.linalg.norm(document)
    if query_norm == 0 or document_norm == 0:
        return 0.0
    return float(dot_product / (query_norm * document_norm))

def load_vectors_and_fragments(db: Session):
    statement = (
        select(Vector, Fragment)
        .join(
            Fragment,
            Vector.fragment_id == Fragment.id,
        )
    )
    rows = db.execute(statement).all()
    return rows

def search_vectors(
    db: Session,
    query_vector: np.ndarray,
    top_k: int = 5,
) -> list[SearchHit]:
    if top_k <= 0:
        raise ValueError("top_k must be greater than 0")

    rows = load_vectors_and_fragments(db)
    list_of_hits = []

    for vector, fragment in rows:
        vector_array = bytes_to_vector(vector.embedding)
        score = cosine_similarity(query_vector, vector_array)
        list_of_hits.append(
            SearchHit(
                fragment_id=fragment.id,
                entry_id=fragment.entry_id,
                content=fragment.content,
                score=score
            )
        )

    list_of_hits.sort(key=lambda hit: hit.score, reverse=True)
    return list_of_hits[:top_k]