"""add image_url to users

Revision ID: 1eb2e18b091f
Revises: 537477e90bfa
Create Date: 2026-03-01 23:44:00.674831

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1eb2e18b091f'
down_revision: Union[str, Sequence[str], None] = '537477e90bfa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('image_url', sa.String(length=500), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'image_url')
