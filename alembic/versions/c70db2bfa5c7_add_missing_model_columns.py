"""add_missing_model_columns

Revision ID: c70db2bfa5c7
Revises: 6a1000000001
Create Date: 2026-11-05 16:15:35.896720

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c70db2bfa5c7'
down_revision: Union[str, Sequence[str], None] = '6a1000000001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add video_url to courses
    op.execute("ALTER TABLE courses ADD COLUMN IF NOT EXISTS video_url VARCHAR;")
    # Add last_accessed_at to course_enrollments
    op.execute("ALTER TABLE course_enrollments ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP WITH TIME ZONE;")
    # Make course_id nullable on course_modules
    op.execute("ALTER TABLE course_modules ALTER COLUMN course_id DROP NOT NULL;")


def downgrade() -> None:
    op.drop_column('courses', 'video_url')
    op.drop_column('course_enrollments', 'last_accessed_at')
