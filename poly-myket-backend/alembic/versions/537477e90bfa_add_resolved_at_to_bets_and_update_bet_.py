"""add resolved_at to bets and update bet status enum

Revision ID: 537477e90bfa
Revises: ec8f67eaaeea
Create Date: 2026-03-01 22:10:56.582090

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '537477e90bfa'
down_revision: Union[str, Sequence[str], None] = 'ec8f67eaaeea'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('bets', sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True))
    # Widen the varchar column to fit new longer enum values
    op.alter_column('bets', 'status', type_=sa.String(length=16), existing_nullable=False)
    # Migrate enum values from resolved_yes/resolved_no to resolved_success/resolved_fail
    op.execute("UPDATE bets SET status = 'resolved_success' WHERE status = 'resolved_yes'")
    op.execute("UPDATE bets SET status = 'resolved_fail' WHERE status = 'resolved_no'")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("UPDATE bets SET status = 'resolved_yes' WHERE status = 'resolved_success'")
    op.execute("UPDATE bets SET status = 'resolved_no' WHERE status = 'resolved_fail'")
    op.drop_column('bets', 'resolved_at')
