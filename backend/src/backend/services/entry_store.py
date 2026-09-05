from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.models import Entry


def get_recent_entries(
    db: Session,
    limit: int = 5,
) -> list[Entry]:
    if limit <= 0:
        raise ValueError("limit must be greater than 0")
    statement = select(Entry).order_by(Entry.created_at.desc()).limit(limit)
    entries = db.execute(statement).scalars().all()
    return list(entries)

def build_entries_context(entries: list[Entry]) -> str:
    return "\n\n".join(
        f"[日记 #{entry.id} | {entry.created_at:%Y-%m-%d}]\n"
        f"{entry.content}"
        for entry in entries
    )