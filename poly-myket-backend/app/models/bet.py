import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class BetStatus(str, enum.Enum):
    OPEN = "open"
    RESOLVED_SUCCESS = "resolved_success"
    RESOLVED_FAIL = "resolved_fail"
    CANCELLED = "cancelled"


class Bet(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "bets"

    group_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("groups.id"), nullable=False)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    subject_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    deadline: Mapped[str | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[BetStatus] = mapped_column(
        Enum(BetStatus, native_enum=False), default=BetStatus.OPEN, server_default="open"
    )
    proof_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    group: Mapped["Group"] = relationship(back_populates="bets")  # noqa: F821
    creator: Mapped["User"] = relationship(foreign_keys=[created_by])  # noqa: F821
    subject: Mapped["User"] = relationship(foreign_keys=[subject_id])  # noqa: F821
    wagers: Mapped[list["Wager"]] = relationship(back_populates="bet")  # noqa: F821
