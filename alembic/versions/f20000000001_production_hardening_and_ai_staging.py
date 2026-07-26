"""production_hardening_and_ai_staging

Revision ID: f20000000001
Revises: f10000000001
Create Date: 2026-07-25 20:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'f20000000001'
down_revision = 'f10000000001'
branch_labels = None
depends_on = None

def upgrade():
    # 1. Add options & correct_answer to exam_questions if not present
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    eq_cols = [c['name'] for c in inspector.get_columns('exam_questions')]
    
    if 'options' not in eq_cols:
        op.add_column('exam_questions', sa.Column('options', sa.JSON(), nullable=True))
    if 'correct_answer' not in eq_cols:
        op.add_column('exam_questions', sa.Column('correct_answer', sa.JSON(), nullable=True))

    # 2. Add is_mandatory to courses if not present
    course_cols = [c['name'] for c in inspector.get_columns('courses')]
    if 'is_mandatory' not in course_cols:
        op.add_column('courses', sa.Column('is_mandatory', sa.Boolean(), server_default='false', nullable=False))

    # 3. Create pending_ai_questions table if not present
    tables = inspector.get_table_names()
    if 'pending_ai_questions' not in tables:
        op.create_table(
            'pending_ai_questions',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column('batch_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('exam_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('exams.id', ondelete='CASCADE'), nullable=True),
            sa.Column('question_text', sa.String(), nullable=False),
            sa.Column('question_type', sa.String(), nullable=False),
            sa.Column('options', sa.JSON(), nullable=True),
            sa.Column('correct_answer', sa.JSON(), nullable=True),
            sa.Column('difficulty_level', sa.String(), server_default='intermediate', nullable=True),
            sa.Column('status', sa.String(), server_default='pending_review', nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False)
        )

    # 4. Create missing indexes for FK performance
    existing_indexes = set()
    for table_name in ['users', 'courses', 'course_enrollments', 'exams', 'exam_submissions', 'exam_questions']:
        if table_name in tables:
            for idx in inspector.get_indexes(table_name):
                existing_indexes.add(idx['name'])

    indexes_to_create = [
        ('idx_users_dept_id', 'users', ['department_id']),
        ('idx_courses_dept_id', 'courses', ['department_id']),
        ('idx_courses_creator', 'courses', ['created_by']),
        ('idx_courses_status_published', 'courses', ['status', 'is_published']),
        ('idx_enrollments_user', 'course_enrollments', ['user_id']),
        ('idx_enrollments_course', 'course_enrollments', ['course_id']),
        ('idx_exams_dept', 'exams', ['department_id']),
        ('idx_exams_course', 'exams', ['course_id']),
        ('idx_exam_submissions_user', 'exam_submissions', ['user_id']),
        ('idx_exam_submissions_exam', 'exam_submissions', ['exam_id']),
        ('idx_exam_questions_exam', 'exam_questions', ['exam_id']),
    ]

    for idx_name, tbl_name, col_names in indexes_to_create:
        if idx_name not in existing_indexes and tbl_name in tables:
            op.create_index(idx_name, tbl_name, col_names)

def downgrade():
    pass
