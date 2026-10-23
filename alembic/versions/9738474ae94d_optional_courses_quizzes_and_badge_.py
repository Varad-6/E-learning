"""optional_courses_quizzes_and_badge_score_thresholds

Revision ID: 9738474ae94d
Revises: 1b198bd9b901
Create Date: 2026-10-22 16:12:10.914058

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9738474ae94d'
down_revision: Union[str, Sequence[str], None] = '1b198bd9b901'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create email_verification_otps if not existing
    conn = op.get_bind()
    insp = sa.inspect(conn)
    if 'email_verification_otps' not in insp.get_table_names():
        op.create_table(
            'email_verification_otps',
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('email', sa.String(), nullable=False),
            sa.Column('otp_code', sa.String(length=6), nullable=False),
            sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('is_verified', sa.Boolean(), nullable=False, server_default=sa.text('false')),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_email_verification_otps_email'), 'email_verification_otps', ['email'], unique=False)

    # 2. Add min_score_percent to badge_tiers
    op.add_column('badge_tiers', sa.Column('min_score_percent', sa.Integer(), nullable=True, server_default=sa.text('0')))

    # 3. Make course_modules.tier and courses.difficulty_level nullable
    op.alter_column('course_modules', 'tier',
               existing_type=sa.VARCHAR(),
               nullable=True)
    op.alter_column('courses', 'difficulty_level',
               existing_type=sa.VARCHAR(),
               nullable=True)

    # 4. Add is_required to quiz_questions and is_optional to quizzes
    op.add_column('quiz_questions', sa.Column('is_required', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('quizzes', sa.Column('is_optional', sa.Boolean(), nullable=False, server_default=sa.text('true')))


def downgrade() -> None:
    op.drop_column('quizzes', 'is_optional')
    op.drop_column('quiz_questions', 'is_required')
    op.alter_column('courses', 'difficulty_level',
               existing_type=sa.VARCHAR(),
               nullable=False)
    op.alter_column('course_modules', 'tier',
               existing_type=sa.VARCHAR(),
               nullable=False)
    op.drop_column('badge_tiers', 'min_score_percent')
    op.drop_table('email_verification_otps')
