"""create_course_module_associations_table

Revision ID: 6a1000000001
Revises: 5debf6462182
Create Date: 2026-10-31 17:35:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '6a1000000001'
down_revision: Union[str, Sequence[str], None] = '5debf6462182'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'course_module_associations' not in tables:
        op.create_table(
            'course_module_associations',
            sa.Column('course_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('courses.id', ondelete='CASCADE'), primary_key=True),
            sa.Column('module_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('course_modules.id', ondelete='CASCADE'), primary_key=True),
            sa.Column('sequence_no', sa.Integer(), nullable=False, server_default='1'),
        )
        op.create_index('ix_cma_course_id', 'course_module_associations', ['course_id'])
        op.create_index('ix_cma_module_id', 'course_module_associations', ['module_id'])

        # Backfill from existing course_modules where course_id is not null
        op.execute("""
            INSERT INTO course_module_associations (course_id, module_id, sequence_no)
            SELECT course_id, id, sequence_no
            FROM course_modules
            WHERE course_id IS NOT NULL
            ON CONFLICT DO NOTHING
        """)


def downgrade() -> None:
    op.drop_table('course_module_associations')
