from sqlalchemy import delete
from sqlalchemy.orm import Session

from backend.models import Entry, Fragment, Vector
from backend.services.chunker import chunk_text
from backend.services.embedding import (
    OpenAIEmbedder,
    vector_to_bytes,
)


def create_fragments_for_entry(
    db: Session,
    entry: Entry,
) -> list[Fragment]:
    """
    根据一篇日记的正文生成 Fragment，并保存到数据库。
    """
    # 先删除旧的片段，保证重复索引不会产生重复数据
    db.execute(
        delete(Fragment).where(Fragment.entry_id == entry.id)
    )

    chunks = chunk_text(entry.content)

    fragments = [
        Fragment(
            entry_id=entry.id,
            seq=chunk.seq,
            content=chunk.content,
        )
        for chunk in chunks
    ]

    db.add_all(fragments)
    db.commit()

    for fragment in fragments:
        db.refresh(fragment)

    return fragments

def create_vectors_for_fragments(
    db: Session,
    fragments: list[Fragment],
    embedder: OpenAIEmbedder,
) -> list[Vector]:
    if not fragments:
        return []

    texts = [fragment.content for fragment in fragments]
    embeddings = embedder.embed(texts)

    vectors = [
        Vector(
            fragment_id=fragment.id,
            embedding=vector_to_bytes(embedding),
            dim=embedder.dim,
            model=embedder.model,
        )
        for fragment, embedding in zip(fragments, embeddings, strict=True)
    ]

    db.add_all(vectors)
    db.commit()

    for vector in vectors:
        db.refresh(vector)

    return vectors

def index_entry(
    db: Session,
    entry: Entry,
    embedder: OpenAIEmbedder,
) -> list[Vector]:
    """
    为一篇日记创建文本片段，并生成对应向量。
    """
    fragments = create_fragments_for_entry(
        db=db,
        entry=entry,
    )

    return create_vectors_for_fragments(
        db=db,
        fragments=fragments,
        embedder=embedder,
    )