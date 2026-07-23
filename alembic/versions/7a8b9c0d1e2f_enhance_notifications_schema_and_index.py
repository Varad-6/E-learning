"""Enhance notifications schema and index

Revision ID: 7a8b9c0d1e2f
Revises: e34eb48522cb
Create Date: 2026-07-23 16:45:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '7a8b9c0d1e2f'
down_revision = '5629644799d0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add related_entity_type and read_at columns if not present
    op.add_column('notifications', sa.Column('related_entity_type', sa.String(), nullable=True))
    op.add_column('notifications', sa.Column('read_at', sa.DateTime(timezone=True), nullable=True))
    
    # Create composite index on (user_id, is_read, created_at)
    op.create_index(
        'idx_notifications_user_read_created',
        'notifications',
        ['user_id', 'is_read', 'created_at'],
        unique=False
    )


def downgrade() -> None:
    op.drop_index('idx_notifications_user_read_created', table_name='notifications')
    op.drop_column('notifications', 'read_at')
    op.drop_column('notifications', 'related_entity_type')
