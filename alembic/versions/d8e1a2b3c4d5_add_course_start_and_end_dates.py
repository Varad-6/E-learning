"""add_course_start_and_end_dates

Revision ID: d8e1a2b3c4d5
Revises: c70db2bfa5c7
Create Date: 2026-11-25 11:22:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd8e1a2b3c4d5'
down_revision: Union[str, Sequence[str], None] = 'c70db2bfa5c7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE courses ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE;")
    op.execute("ALTER TABLE courses ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE;")


def downgrade() -> None:
    op.drop_column('courses', 'end_date')
    op.drop_column('courses', 'start_date')
