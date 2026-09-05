from typing import Annotated

from fastapi import APIRouter, Depends, Query, status, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from backend.db import get_db
from backend.models import Entry, Fragment, Vector
from backend.schemas import EntryCreate, EntryResponse
from backend.services.embedding import OpenAIEmbedder
from backend.services.indexing import index_entry

router = APIRouter(
    prefix="/entries",
    tags=["entries"],
)

DbSession = Annotated[Session, Depends(get_db)]


@router.post(
    "",
    response_model=EntryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_entry(
    payload: EntryCreate,
    db: DbSession,
) -> Entry:
    entry = Entry(content=payload.content)

    db.add(entry)
    db.commit()
    db.refresh(entry)
    
    embedder = OpenAIEmbedder()

    index_entry(
        db=db,
        entry=entry,
        embedder=embedder,
)

    return entry

@router.get(
    "",
    response_model=list[EntryResponse],
)
def list_entries(
    db: DbSession,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[Entry]:
    statement = (
        select(Entry)
        .order_by(Entry.created_at.desc(), Entry.id.desc())
        .offset(offset)
        .limit(limit)
    )

    return list(db.execute(statement).scalars().all())

@router.get(
    "/{entry_id}",
    response_model=EntryResponse,
)
def get_entry(
    entry_id: int,
    db: DbSession,
) -> Entry:
    entry = db.get(Entry, entry_id)

    if entry is None:
        raise HTTPException(
            status_code=404,
            detail="Entry not found",
        )

    return entry

@router.delete(
    "/{entry_id}",
    status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(
    entry_id: int,
    db: DbSession,
) -> None:
    entry = db.get(Entry, entry_id)

    if entry is None:
        raise HTTPException(
            status_code=404,
            detail="Entry not found",
        )

    fragment_ids = select(Fragment.id).where(
        Fragment.entry_id == entry.id
    )

    db.execute(
        delete(Vector).where(Vector.fragment_id.in_(fragment_ids))
    )
    db.execute(
        delete(Fragment).where(Fragment.entry_id == entry.id)
    )
    db.delete(entry)
    db.commit()
