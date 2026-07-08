"""add value and label to module contents

Revision ID: 613f4934befa
Revises: 69ed1cd59095
Create Date: 2026-07-08 10:44:49.190018

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '613f4934befa'
down_revision: Union[str, Sequence[str], None] = '69ed1cd59095'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('module_contents', sa.Column('value', sa.String(), nullable=True))
    op.add_column('module_contents', sa.Column('label', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('module_contents', 'label')
    op.drop_column('module_contents', 'value')
