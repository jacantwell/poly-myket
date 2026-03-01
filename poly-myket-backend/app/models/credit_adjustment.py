import uuid

from sqlalchemy import ForeignKey, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class CreditAdjustment(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "credit_adjustments"

    member_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("group_members.id"), nullable=False)
    adjusted_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    member: Mapped["GroupMember"] = relationship(back_populates="credit_adjustments")  # noqa: F821
    admin: Mapped["User"] = relationship()  # noqa: F821
