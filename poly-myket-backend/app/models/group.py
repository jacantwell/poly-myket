import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class GroupRole(str, enum.Enum):
    ADMIN = "admin"
    MEMBER = "member"


class Group(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "groups"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    invite_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    starting_credits: Mapped[float] = mapped_column(
        Numeric(10, 2), default=0, server_default="0"
    )

    members: Mapped[list["GroupMember"]] = relationship(back_populates="group")
    bets: Mapped[list["Bet"]] = relationship(back_populates="group")  # noqa: F821


class GroupMember(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "group_members"

    group_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("groups.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    credit_balance: Mapped[float] = mapped_column(Numeric(10, 2), default=0, server_default="0")
    role: Mapped[GroupRole] = mapped_column(
        Enum(GroupRole, native_enum=False), default=GroupRole.MEMBER, server_default="member"
    )

    group: Mapped["Group"] = relationship(back_populates="members")
    user: Mapped["User"] = relationship(back_populates="group_memberships")  # noqa: F821
    credit_adjustments: Mapped[list["CreditAdjustment"]] = relationship(back_populates="member")  # noqa: F821
