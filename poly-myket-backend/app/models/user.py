from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"

    clerk_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True, default=None)

    email_bet_created: Mapped[bool] = mapped_column(Boolean, default=True, server_default="1")
    email_wager_placed: Mapped[bool] = mapped_column(Boolean, default=True, server_default="1")
    email_bet_resolved: Mapped[bool] = mapped_column(Boolean, default=True, server_default="1")

    group_memberships: Mapped[list["GroupMember"]] = relationship(back_populates="user")  # noqa: F821
    wagers: Mapped[list["Wager"]] = relationship(back_populates="user")  # noqa: F821
