"""add starting_credits to groups

Revision ID: 369be0577cf6
Revises: 1eb2e18b091f
Create Date: 2026-03-02 00:03:49.849495

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '369be0577cf6'
down_revision: Union[str, Sequence[str], None] = '1eb2e18b091f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('groups', sa.Column('starting_credits', sa.Numeric(precision=10, scale=2), server_default='0', nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('groups', 'starting_credits')
