from datetime import datetime

from sqlalchemy import DateTime, Text, func, ForeignKey, UniqueConstraint, LargeBinary, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.db import Base

class Entry(Base):
    __tablename__ = "entries"
    id: Mapped[int] = mapped_column(primary_key=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    mood: Mapped[str | None] = mapped_column(String(32), nullable=True)
    place: Mapped[str | None] = mapped_column(String(64), nullable=True)
    weather: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self) -> str:
        return (
            f"Entry(id={self.id!r}, content={self.content!r}, "
            f"created_at={self.created_at!r}, updated_at={self.updated_at!r})"
        )

class Fragment(Base):
    __tablename__ = "fragments"
    id: Mapped[int] = mapped_column(primary_key=True)
    entry_id: Mapped[int] = mapped_column(
        ForeignKey("entries.id", ondelete="CASCADE"),
        nullable=False,
    )
    seq: Mapped[int] = mapped_column(nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=func.now(),
        nullable=False,
    )

    entry: Mapped["Entry"] = relationship(backref="fragments")

    __table_args__ = (
        UniqueConstraint("entry_id", "seq", name="uq_fragments_entry_seq"),
    )

    def __repr__(self) -> str:
        return (
            f"Fragment(id={self.id!r}, entry_id={self.entry_id!r}, "
            f"seq={self.seq!r}, content={self.content!r})"
        )

class Vector(Base):
    __tablename__="vectors"
    id: Mapped[int] = mapped_column(primary_key=True)
    fragment_id: Mapped[int] = mapped_column(
        ForeignKey("fragments.id",ondelete="CASCADE"),
        unique=True,
        nullable=False
    )
    embedding: Mapped[bytes] = mapped_column(
        LargeBinary,
        nullable=False
    )
    dim: Mapped[int] = mapped_column(nullable=False)
    model: Mapped[str] = mapped_column(String(128), nullable=False)
    indexed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=func.now(),
        nullable=False
    )

    fragment: Mapped["Fragment"] = relationship(backref="vector", uselist=False)

    def __repr__(self) -> str:
        return (
            f"Vector(id={self.id!r}, fragment_id={self.fragment_id!r}, "
            f"dim={self.dim!r}, model={self.model!r})"
        )

class AppSetting(Base):
    """用户自定义设置（key/value）。value 为空字符串或缺失 = 使用 .env 默认。"""
    __tablename__ = "settings"
    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[str] = mapped_column(String(1024), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"AppSetting(key={self.key!r}, value={self.value!r})"