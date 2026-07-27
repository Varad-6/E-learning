"""add_email_verified_column

Revision ID: f30000000001
Revises: f20000000001
Create Date: 2026-07-27 16:15:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'f30000000001'
down_revision = 'f20000000001'
branch_labels = None
depends_on = None

def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    user_cols = [c['name'] for c in inspector.get_columns('users')]
    if 'email_verified' not in user_cols:
        op.add_column('users', sa.Column('email_verified', sa.Boolean(), server_default='false', nullable=False))

def downgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    user_cols = [c['name'] for c in inspector.get_columns('users')]
    if 'email_verified' in user_cols:
        op.drop_column('users', 'email_verified')
