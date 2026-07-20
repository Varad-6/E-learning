"""add_dashboard_fk_indexes

Revision ID: d20000000001
Revises: c10000000001
Create Date: 2026-07-20

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'd20000000001'
down_revision: Union[str, Sequence[str], None] = 'c10000000001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index('ix_users_department_id', 'users', ['department_id'], unique=False)
    op.create_index('ix_courses_department_id', 'courses', ['department_id'], unique=False)
    op.create_index('ix_courses_created_by', 'courses', ['created_by'], unique=False)
    op.create_index('ix_course_enrollments_user_id', 'course_enrollments', ['user_id'], unique=False)
    op.create_index('ix_course_enrollments_course_id', 'course_enrollments', ['course_id'], unique=False)
    op.create_index('ix_exams_course_id', 'exams', ['course_id'], unique=False)
    op.create_index('ix_exams_department_id', 'exams', ['department_id'], unique=False)
    op.create_index('ix_exam_submissions_exam_id', 'exam_submissions', ['exam_id'], unique=False)
    op.create_index('ix_exam_submissions_user_id', 'exam_submissions', ['user_id'], unique=False)
    op.create_index('ix_exam_assignments_exam_id', 'exam_assignments', ['exam_id'], unique=False)
    op.create_index('ix_exam_assignments_department_id', 'exam_assignments', ['department_id'], unique=False)
    op.create_index('ix_audit_logs_actor', 'audit_logs', ['actor'], unique=False)
    op.create_index('ix_audit_logs_timestamp', 'audit_logs', ['timestamp'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_audit_logs_timestamp', table_name='audit_logs')
    op.drop_index('ix_audit_logs_actor', table_name='audit_logs')
    op.drop_index('ix_exam_assignments_department_id', table_name='exam_assignments')
    op.drop_index('ix_exam_assignments_exam_id', table_name='exam_assignments')
    op.drop_index('ix_exam_submissions_user_id', table_name='exam_submissions')
    op.drop_index('ix_exam_submissions_exam_id', table_name='exam_submissions')
    op.drop_index('ix_exams_department_id', table_name='exams')
    op.drop_index('ix_exams_course_id', table_name='exams')
    op.drop_index('ix_course_enrollments_course_id', table_name='course_enrollments')
    op.drop_index('ix_course_enrollments_user_id', table_name='course_enrollments')
    op.drop_index('ix_courses_created_by', table_name='courses')
    op.drop_index('ix_courses_department_id', table_name='courses')
    op.drop_index('ix_users_department_id', table_name='users')
