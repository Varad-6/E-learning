"""make_course_id_nullable_on_exams

Revision ID: 1b198bd9b901
Revises: f30000000001
Create Date: 2026-07-30 05:04:45.052515

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '1b198bd9b901'
down_revision: Union[str, Sequence[str], None] = 'f30000000001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column('exams', 'course_id',
               existing_type=postgresql.UUID(),
               nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('exams', 'course_id',
               existing_type=postgresql.UUID(),
               nullable=False)
