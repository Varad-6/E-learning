import subprocess
import os

# Configuration
SERVER = os.environ.get("DEPLOY_SERVER", "root@192.168.50.55")
PROJECT_ROOT = os.environ.get("DEPLOY_PROJECT_ROOT", "/var/www/kaizen")

# Complete List of all files for Phase 2 deployment
FILES_TO_COPY = [
    # 1. Database Migrations & Alembic
    ("alembic.ini", f"{PROJECT_ROOT}/"),
    ("alembic/env.py", f"{PROJECT_ROOT}/alembic/"),
    ("alembic/script.py.mako", f"{PROJECT_ROOT}/alembic/"),
    ("alembic/versions/068da708842c_phase1_course_management.py", f"{PROJECT_ROOT}/alembic/versions/"),
    ("alembic/versions/1b198bd9b901_make_course_id_nullable_on_exams.py", f"{PROJECT_ROOT}/alembic/versions/"),
    ("alembic/versions/2471d49ce377_create_exams_tables.py", f"{PROJECT_ROOT}/alembic/versions/"),
    ("alembic/versions/3a3c96215ccc_add_question_type_to_quizzes.py", f"{PROJECT_ROOT}/alembic/versions/"),
    ("alembic/versions/3ad91bd45fc4_add_progress_percent_to_course_.py", f"{PROJECT_ROOT}/alembic/versions/"),
    ("alembic/versions/416156a8f3cf_add_duration_and_priority_to_courses.py", f"{PROJECT_ROOT}/alembic/versions/"),
    ("alembic/versions/5629644799d0_add_badge_tiers_and_update_user_badges.py", f"{PROJECT_ROOT}/alembic/versions/"),
    ("alembic/versions/5828cd322106_add_exam_reviews.py", f"{PROJECT_ROOT}/alembic/versions/"),
    ("alembic/versions/5debf6462182_create_course_departments_table.py", f"{PROJECT_ROOT}/alembic/versions/"),
    ("alembic/versions/613f4934befa_add_value_and_label_to_module_contents.py", f"{PROJECT_ROOT}/alembic/versions/"),
    ("alembic/versions/69ed1cd59095_migrate_old_roles_to_new_hierarchy.py", f"{PROJECT_ROOT}/alembic/versions/"),
    ("alembic/versions/6a1000000001_create_course_module_associations.py", f"{PROJECT_ROOT}/alembic/versions/"),
    ("alembic/versions/7a8b9c0d1e2f_enhance_notifications_schema_and_index.py", f"{PROJECT_ROOT}/alembic/versions/"),
    ("alembic/versions/8ad39aec5125_create_user_module_notes_table.py", f"{PROJECT_ROOT}/alembic/versions/"),
    ("alembic/versions/9738474ae94d_optional_courses_quizzes_and_badge_.py", f"{PROJECT_ROOT}/alembic/versions/"),
    ("alembic/versions/a280c8373256_add_tier_published_at_and_mandatory.py", f"{PROJECT_ROOT}/alembic/versions/"),
    ("alembic/versions/af873d13dbea_add_user_badges.py", f"{PROJECT_ROOT}/alembic/versions/"),
    ("alembic/versions/bedea55dab50_create_notifications.py", f"{PROJECT_ROOT}/alembic/versions/"),
    ("alembic/versions/c10000000001_exam_reporting_leaderboard.py", f"{PROJECT_ROOT}/alembic/versions/"),
    ("alembic/versions/c70db2bfa5c7_add_missing_model_columns.py", f"{PROJECT_ROOT}/alembic/versions/"),
    ("alembic/versions/cd4ec1a6712e_create_authentication_schema.py", f"{PROJECT_ROOT}/alembic/versions/"),
    ("alembic/versions/d20000000001_add_dashboard_fk_indexes.py", f"{PROJECT_ROOT}/alembic/versions/"),
    ("alembic/versions/e3116af5559a_add_locking_and_deadline_to_enrollments.py", f"{PROJECT_ROOT}/alembic/versions/"),
    ("alembic/versions/e34eb48522cb_add_audit_logs.py", f"{PROJECT_ROOT}/alembic/versions/"),
    ("alembic/versions/f10000000001_add_enrolled_by_and_role_history.py", f"{PROJECT_ROOT}/alembic/versions/"),
    ("alembic/versions/f20000000001_production_hardening_and_ai_staging.py", f"{PROJECT_ROOT}/alembic/versions/"),
    ("alembic/versions/f30000000001_add_email_verified_column.py", f"{PROJECT_ROOT}/alembic/versions/"),

    # 2. Backend Core & Database
    ("app/core/config.py", f"{PROJECT_ROOT}/app/core/"),
    ("app/core/dependencies.py", f"{PROJECT_ROOT}/app/core/"),
    ("app/database/session.py", f"{PROJECT_ROOT}/app/database/"),
    ("app/main.py", f"{PROJECT_ROOT}/app/"),

    # 3. Backend Models
    ("app/models/__init__.py", f"{PROJECT_ROOT}/app/models/"),
    ("app/models/badge_tier.py", f"{PROJECT_ROOT}/app/models/"),
    ("app/models/course.py", f"{PROJECT_ROOT}/app/models/"),
    ("app/models/course_approval.py", f"{PROJECT_ROOT}/app/models/"),
    ("app/models/course_department.py", f"{PROJECT_ROOT}/app/models/"),
    ("app/models/course_enrollment.py", f"{PROJECT_ROOT}/app/models/"),
    ("app/models/course_module.py", f"{PROJECT_ROOT}/app/models/"),
    ("app/models/department.py", f"{PROJECT_ROOT}/app/models/"),
    ("app/models/module_content.py", f"{PROJECT_ROOT}/app/models/"),
    ("app/models/notification.py", f"{PROJECT_ROOT}/app/models/"),
    ("app/models/otp.py", f"{PROJECT_ROOT}/app/models/"),
    ("app/models/quiz.py", f"{PROJECT_ROOT}/app/models/"),
    ("app/models/quiz_attempt.py", f"{PROJECT_ROOT}/app/models/"),
    ("app/models/quiz_question.py", f"{PROJECT_ROOT}/app/models/"),
    ("app/models/refresh_token.py", f"{PROJECT_ROOT}/app/models/"),
    ("app/models/role.py", f"{PROJECT_ROOT}/app/models/"),
    ("app/models/role_history.py", f"{PROJECT_ROOT}/app/models/"),
    ("app/models/user.py", f"{PROJECT_ROOT}/app/models/"),
    ("app/models/user_course_progress.py", f"{PROJECT_ROOT}/app/models/"),
    ("app/models/user_module_note.py", f"{PROJECT_ROOT}/app/models/"),
    ("app/models/user_role.py", f"{PROJECT_ROOT}/app/models/"),

    # 4. Backend Schemas
    ("app/schemas/__init__.py", f"{PROJECT_ROOT}/app/schemas/"),
    ("app/schemas/admin.py", f"{PROJECT_ROOT}/app/schemas/"),
    ("app/schemas/auth.py", f"{PROJECT_ROOT}/app/schemas/"),
    ("app/schemas/badge.py", f"{PROJECT_ROOT}/app/schemas/"),
    ("app/schemas/course.py", f"{PROJECT_ROOT}/app/schemas/"),
    ("app/schemas/dashboard.py", f"{PROJECT_ROOT}/app/schemas/"),
    ("app/schemas/department.py", f"{PROJECT_ROOT}/app/schemas/"),
    ("app/schemas/enrollment.py", f"{PROJECT_ROOT}/app/schemas/"),
    ("app/schemas/notification.py", f"{PROJECT_ROOT}/app/schemas/"),
    ("app/schemas/quiz.py", f"{PROJECT_ROOT}/app/schemas/"),
    ("app/schemas/user.py", f"{PROJECT_ROOT}/app/schemas/"),

    # 5. Backend Services
    ("app/services/admin_service.py", f"{PROJECT_ROOT}/app/services/"),
    ("app/services/audit_service.py", f"{PROJECT_ROOT}/app/services/"),
    ("app/services/auth_service.py", f"{PROJECT_ROOT}/app/services/"),
    ("app/services/badge_service.py", f"{PROJECT_ROOT}/app/services/"),
    ("app/services/course_service.py", f"{PROJECT_ROOT}/app/services/"),
    ("app/services/dashboard_service.py", f"{PROJECT_ROOT}/app/services/"),
    ("app/services/department_service.py", f"{PROJECT_ROOT}/app/services/"),
    ("app/services/email_service.py", f"{PROJECT_ROOT}/app/services/"),
    ("app/services/enrollment_service.py", f"{PROJECT_ROOT}/app/services/"),
    ("app/services/module_service.py", f"{PROJECT_ROOT}/app/services/"),
    ("app/services/notification_service.py", f"{PROJECT_ROOT}/app/services/"),
    ("app/services/otp_service.py", f"{PROJECT_ROOT}/app/services/"),
    ("app/services/quiz_service.py", f"{PROJECT_ROOT}/app/services/"),
    ("app/services/token_service.py", f"{PROJECT_ROOT}/app/services/"),

    # 6. Backend API Routes
    ("app/api/admin.py", f"{PROJECT_ROOT}/app/api/"),
    ("app/api/auth.py", f"{PROJECT_ROOT}/app/api/"),
    ("app/api/course.py", f"{PROJECT_ROOT}/app/api/"),
    ("app/api/dashboard.py", f"{PROJECT_ROOT}/app/api/"),
    ("app/api/department.py", f"{PROJECT_ROOT}/app/api/"),
    ("app/api/employee_dashboard.py", f"{PROJECT_ROOT}/app/api/"),
    ("app/api/enrollment.py", f"{PROJECT_ROOT}/app/api/"),
    ("app/api/module.py", f"{PROJECT_ROOT}/app/api/"),
    ("app/api/quiz.py", f"{PROJECT_ROOT}/app/api/"),
    ("app/api/reporting.py", f"{PROJECT_ROOT}/app/api/"),
    ("app/api/user_management.py", f"{PROJECT_ROOT}/app/api/"),

    # 7. Seeds & Utilities
    ("app/seeds/backfill_course_creators.py", f"{PROJECT_ROOT}/app/seeds/"),
    ("seed_db.py", f"{PROJECT_ROOT}/"),
    ("seed_selected_users.py", f"{PROJECT_ROOT}/"),
    ("setup_backup_db.py", f"{PROJECT_ROOT}/"),
    ("requirements.txt", f"{PROJECT_ROOT}/"),

    # 8. Frontend Components & Pages
    ("frontend/package.json", f"{PROJECT_ROOT}/frontend/"),
    ("frontend/vite.config.ts", f"{PROJECT_ROOT}/frontend/"),
    ("frontend/index.html", f"{PROJECT_ROOT}/frontend/"),
    ("frontend/src/App.tsx", f"{PROJECT_ROOT}/frontend/src/"),
    ("frontend/src/context/AuthContext.tsx", f"{PROJECT_ROOT}/frontend/src/context/"),
    ("frontend/src/services/api.ts", f"{PROJECT_ROOT}/frontend/src/services/"),
    ("frontend/src/styles/theme.css", f"{PROJECT_ROOT}/frontend/src/styles/"),
    ("frontend/src/utils/coursePermissions.ts", f"{PROJECT_ROOT}/frontend/src/utils/"),
    ("frontend/src/utils/duration.ts", f"{PROJECT_ROOT}/frontend/src/utils/"),
    ("frontend/src/utils/youtube.ts", f"{PROJECT_ROOT}/frontend/src/utils/"),
    ("frontend/src/components/Button/Button.css", f"{PROJECT_ROOT}/frontend/src/components/Button/"),
    ("frontend/src/components/CourseraRichText/CourseraRichText.tsx", f"{PROJECT_ROOT}/frontend/src/components/CourseraRichText/"),
    ("frontend/src/components/CourseraRichText/CourseraRichText.css", f"{PROJECT_ROOT}/frontend/src/components/CourseraRichText/"),
    ("frontend/src/components/DurationInput/DurationInput.tsx", f"{PROJECT_ROOT}/frontend/src/components/DurationInput/"),
    ("frontend/src/components/DurationInput/DurationInput.css", f"{PROJECT_ROOT}/frontend/src/components/DurationInput/"),
    ("frontend/src/components/LearnersModal/LearnersModal.tsx", f"{PROJECT_ROOT}/frontend/src/components/LearnersModal/"),
    ("frontend/src/components/LearnersModal/LearnersModal.css", f"{PROJECT_ROOT}/frontend/src/components/LearnersModal/"),
    ("frontend/src/components/Modal/Modal.tsx", f"{PROJECT_ROOT}/frontend/src/components/Modal/"),
    ("frontend/src/components/Modal/Modal.css", f"{PROJECT_ROOT}/frontend/src/components/Modal/"),
    ("frontend/src/components/Navbar/Navbar.tsx", f"{PROJECT_ROOT}/frontend/src/components/Navbar/"),
    ("frontend/src/components/Navbar/Navbar.css", f"{PROJECT_ROOT}/frontend/src/components/Navbar/"),
    ("frontend/src/components/YouTubeEmbed/YouTubeEmbed.tsx", f"{PROJECT_ROOT}/frontend/src/components/YouTubeEmbed/"),
    ("frontend/src/components/YouTubeEmbed/YouTubeEmbed.css", f"{PROJECT_ROOT}/frontend/src/components/YouTubeEmbed/"),
    ("frontend/src/components/YouTubePlayer/YouTubePlayer.tsx", f"{PROJECT_ROOT}/frontend/src/components/YouTubePlayer/"),
    ("frontend/src/components/YouTubePlayer/YouTubePlayer.css", f"{PROJECT_ROOT}/frontend/src/components/YouTubePlayer/"),
    ("frontend/src/pages/Admin/UserAdminStudio.tsx", f"{PROJECT_ROOT}/frontend/src/pages/Admin/"),
    ("frontend/src/pages/CoursePlayer/CoursePlayer.tsx", f"{PROJECT_ROOT}/frontend/src/pages/CoursePlayer/"),
    ("frontend/src/pages/CoursePlayer/CoursePlayer.css", f"{PROJECT_ROOT}/frontend/src/pages/CoursePlayer/"),
    ("frontend/src/pages/Courses/CoursesPage.tsx", f"{PROJECT_ROOT}/frontend/src/pages/Courses/"),
    ("frontend/src/pages/Courses/CoursesPage.css", f"{PROJECT_ROOT}/frontend/src/pages/Courses/"),
    ("frontend/src/pages/Creator/CourseSyllabus.tsx", f"{PROJECT_ROOT}/frontend/src/pages/Creator/"),
    ("frontend/src/pages/Creator/CreatorDashboard.tsx", f"{PROJECT_ROOT}/frontend/src/pages/Creator/"),
    ("frontend/src/pages/Creator/Creator.css", f"{PROJECT_ROOT}/frontend/src/pages/Creator/"),
    ("frontend/src/pages/Creator/ExamCreator.tsx", f"{PROJECT_ROOT}/frontend/src/pages/Creator/"),
    ("frontend/src/pages/Creator/ExamReviewer.tsx", f"{PROJECT_ROOT}/frontend/src/pages/Creator/"),
    ("frontend/src/pages/Creator/ModuleEditor.tsx", f"{PROJECT_ROOT}/frontend/src/pages/Creator/"),
    ("frontend/src/pages/Dashboard/Dashboard.tsx", f"{PROJECT_ROOT}/frontend/src/pages/Dashboard/"),
    ("frontend/src/pages/Dashboard/Dashboard.css", f"{PROJECT_ROOT}/frontend/src/pages/Dashboard/"),
    ("frontend/src/pages/Exams/ExamsCenter.tsx", f"{PROJECT_ROOT}/frontend/src/pages/Exams/"),
    ("frontend/src/pages/Login/Login.tsx", f"{PROJECT_ROOT}/frontend/src/pages/Login/"),
    ("frontend/src/pages/Reporting/ReportingDashboard.tsx", f"{PROJECT_ROOT}/frontend/src/pages/Reporting/"),
    ("frontend/src/pages/ViewCourses/ViewCourses.tsx", f"{PROJECT_ROOT}/frontend/src/pages/ViewCourses/"),

    # 9. Deployment Specification Guide
    ("DEPLOYMENT_PHASE_2.md", f"{PROJECT_ROOT}/"),
]

def main():
    print("=" * 65)
    print(f"🚀 KAIZEN DEPLOYMENT PHASE 2: PUSH TO {SERVER}")
    print(f"   Target Directory: {PROJECT_ROOT}")
    print("=" * 65)

    success_count = 0
    fail_count = 0

    for local_file, remote_dir in FILES_TO_COPY:
        if not os.path.exists(local_file):
            print(f"⚠️  Skipping: '{local_file}' (File not found locally)")
            fail_count += 1
            continue

        remote_path = f"{SERVER}:{remote_dir}"
        cmd = ["scp", local_file, remote_path]
        
        print(f"📤 Transferring: {local_file} -> {remote_dir}")
        try:
            result = subprocess.run(cmd, check=True)
            if result.returncode == 0:
                print(f"✅ Successfully copied {local_file}")
                success_count += 1
        except Exception as e:
            print(f"❌ Error copying {local_file}: {e}")
            fail_count += 1
        print("-" * 65)

    print("\n📊 Phase 2 Deployment Summary:")
    print(f"   Successful Transfers: {success_count}")
    print(f"   Failed/Skipped: {fail_count}")
    print("=" * 65)
    print("Next Steps on Remote Host:")
    print("1. SSH into the server: ssh " + SERVER)
    print("2. Navigate to directory: cd " + PROJECT_ROOT)
    print("3. Run database migrations: alembic upgrade head")
    print("4. Restart backend: sudo systemctl restart kaizen-backend")
    print("5. Rebuild frontend: cd frontend && npm run build")
    print("=" * 65)

if __name__ == "__main__":
    main()
