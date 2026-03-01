import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class WagerSide(str, enum.Enum):
    YES = "yes"
    NO = "no"


class Wager(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "wagers"

    bet_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("bets.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    side: Mapped[WagerSide] = mapped_column(Enum(WagerSide, native_enum=False), nullable=False)

    bet: Mapped["Bet"] = relationship(back_populates="wagers")  # noqa: F821
    user: Mapped["User"] = relationship(back_populates="wagers")  # noqa: F821
