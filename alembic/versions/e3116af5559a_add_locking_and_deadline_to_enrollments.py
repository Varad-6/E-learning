"""add_locking_and_deadline_to_enrollments

Revision ID: e3116af5559a
Revises: 8ad39aec5125
Create Date: 2026-07-09 11:00:18.502437

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e3116af5559a'
down_revision: Union[str, Sequence[str], None] = '8ad39aec5125'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('course_enrollments', sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('course_enrollments', sa.Column('is_locked', sa.Boolean(), server_default='false', nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('course_enrollments', 'is_locked')
    op.drop_column('course_enrollments', 'expires_at')
