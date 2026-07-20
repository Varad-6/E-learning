"""exam_reporting_leaderboard

Revision ID: c10000000001
Revises: bedea55dab50
Create Date: 2026-07-20

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'c10000000001'
down_revision: Union[str, Sequence[str], None] = 'bedea55dab50'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Make department_id nullable on exams table
    op.alter_column('exams', 'department_id',
               existing_type=postgresql.UUID(),
               nullable=True)

    # 2. Make department_id nullable on exam_reviews table
    op.alter_column('exam_reviews', 'department_id',
               existing_type=postgresql.UUID(),
               nullable=True)

    # 3. Add overall_score float column to exam_grades table
    op.add_column('exam_grades', sa.Column('overall_score', sa.Float(), nullable=True))

    # 4. Create exam_assignments table
    op.create_table(
        'exam_assignments',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('exam_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('department_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('assigned_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['exam_id'], ['exams.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('exam_assignments')
    op.drop_column('exam_grades', 'overall_score')
    op.alter_column('exam_reviews', 'department_id',
               existing_type=postgresql.UUID(),
               nullable=False)
    op.alter_column('exams', 'department_id',
               existing_type=postgresql.UUID(),
               nullable=False)
