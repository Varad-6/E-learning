"""create_course_departments_table

Revision ID: 5debf6462182
Revises: 9738474ae94d
Create Date: 2026-10-27 23:41:30.577125

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '5debf6462182'
down_revision: Union[str, Sequence[str], None] = '9738474ae94d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'course_departments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('course_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('courses.id', ondelete='CASCADE'), nullable=False),
        sa.Column('department_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('departments.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
    )
    op.create_index('ix_course_departments_course_id', 'course_departments', ['course_id'])
    op.create_index('ix_course_departments_department_id', 'course_departments', ['department_id'])

    # Backfill existing courses with department_id into course_departments
    op.execute("""
        INSERT INTO course_departments (id, course_id, department_id, created_at)
        SELECT gen_random_uuid(), id, department_id, now()
        FROM courses
        WHERE department_id IS NOT NULL
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_course_departments_department_id', table_name='course_departments')
    op.drop_index('ix_course_departments_course_id', table_name='course_departments')
    op.drop_table('course_departments')
