"""add enrolled_by to enrollments and create role_history table

Revision ID: f10000000001
Revises: d20000000001
Create Date: 2026-07-25 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'f10000000001'
down_revision = '7a8b9c0d1e2f'
branch_labels = None
depends_on = None


def upgrade():
    # Add enrolled_by to course_enrollments for audit trail
    op.add_column(
        'course_enrollments',
        sa.Column('enrolled_by', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='SET NULL'),
                  nullable=True)
    )
    op.create_index(
        'ix_course_enrollments_enrolled_by',
        'course_enrollments',
        ['enrolled_by']
    )

    # Create role_history table
    op.create_table(
        'role_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('previous_role', sa.String(), nullable=False),
        sa.Column('new_role', sa.String(), nullable=False),
        sa.Column('changed_by', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('changed_at', sa.DateTime(timezone=True),
                  server_default=sa.func.now(), nullable=False),
        sa.Column('reason', sa.Text(), nullable=True),
    )
    op.create_index('ix_role_history_user_id', 'role_history', ['user_id'])
    op.create_index('ix_role_history_changed_at', 'role_history', ['changed_at'])


def downgrade():
    op.drop_index('ix_role_history_changed_at', table_name='role_history')
    op.drop_index('ix_role_history_user_id', table_name='role_history')
    op.drop_table('role_history')
    op.drop_index('ix_course_enrollments_enrolled_by', table_name='course_enrollments')
    op.drop_column('course_enrollments', 'enrolled_by')
