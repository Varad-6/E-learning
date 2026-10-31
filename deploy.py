import subprocess
import os

# Configuration
SERVER = os.environ.get("DEPLOY_SERVER", "root@192.168.50.55")
PROJECT_ROOT = os.environ.get("DEPLOY_PROJECT_ROOT", "/var/www/kaizen")

# Complete List of all files modified/created for deployment
FILES_TO_COPY = [
    # 1. Database Migrations & Alembic
    ("alembic/env.py", f"{PROJECT_ROOT}/alembic/"),
    ("alembic/versions/9738474ae94d_optional_courses_quizzes_and_badge_.py", f"{PROJECT_ROOT}/alembic/versions/"),
    ("alembic/versions/5debf6462182_create_course_departments_table.py", f"{PROJECT_ROOT}/alembic/versions/"),

    # 2. Backend Core & Database Routing
    ("app/core/config.py", f"{PROJECT_ROOT}/app/core/"),
    ("app/database/session.py", f"{PROJECT_ROOT}/app/database/"),
    ("app/main.py", f"{PROJECT_ROOT}/app/"),

    # 3. Backend Models
    ("app/models/__init__.py", f"{PROJECT_ROOT}/app/models/"),
    ("app/models/badge_tier.py", f"{PROJECT_ROOT}/app/models/"),
    ("app/models/course.py", f"{PROJECT_ROOT}/app/models/"),
    ("app/models/course_department.py", f"{PROJECT_ROOT}/app/models/"),
    ("app/models/course_enrollment.py", f"{PROJECT_ROOT}/app/models/"),
    ("app/models/course_module.py", f"{PROJECT_ROOT}/app/models/"),
    ("app/models/department.py", f"{PROJECT_ROOT}/app/models/"),
    ("app/models/quiz.py", f"{PROJECT_ROOT}/app/models/"),
    ("app/models/quiz_question.py", f"{PROJECT_ROOT}/app/models/"),

    # 4. Backend Schemas
    ("app/schemas/admin.py", f"{PROJECT_ROOT}/app/schemas/"),
    ("app/schemas/badge.py", f"{PROJECT_ROOT}/app/schemas/"),
    ("app/schemas/course.py", f"{PROJECT_ROOT}/app/schemas/"),
    ("app/schemas/department.py", f"{PROJECT_ROOT}/app/schemas/"),
    ("app/schemas/enrollment.py", f"{PROJECT_ROOT}/app/schemas/"),
    ("app/schemas/quiz.py", f"{PROJECT_ROOT}/app/schemas/"),

    # 5. Backend Services
    ("app/services/admin_service.py", f"{PROJECT_ROOT}/app/services/"),
    ("app/services/audit_service.py", f"{PROJECT_ROOT}/app/services/"),
    ("app/services/badge_service.py", f"{PROJECT_ROOT}/app/services/"),
    ("app/services/course_service.py", f"{PROJECT_ROOT}/app/services/"),
    ("app/services/dashboard_service.py", f"{PROJECT_ROOT}/app/services/"),
    ("app/services/department_service.py", f"{PROJECT_ROOT}/app/services/"),
    ("app/services/enrollment_service.py", f"{PROJECT_ROOT}/app/services/"),
    ("app/services/module_service.py", f"{PROJECT_ROOT}/app/services/"),
    ("app/services/quiz_service.py", f"{PROJECT_ROOT}/app/services/"),

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

    # 7. Frontend Source Pages & Components
    ("frontend/src/App.tsx", f"{PROJECT_ROOT}/frontend/src/"),
    ("frontend/src/components/Navbar/Navbar.tsx", f"{PROJECT_ROOT}/frontend/src/components/Navbar/"),
    ("frontend/src/components/Navbar/Navbar.css", f"{PROJECT_ROOT}/frontend/src/components/Navbar/"),
    ("frontend/src/services/api.ts", f"{PROJECT_ROOT}/frontend/src/services/"),
    ("frontend/src/styles/theme.css", f"{PROJECT_ROOT}/frontend/src/styles/"),
    ("frontend/src/context/AuthContext.tsx", f"{PROJECT_ROOT}/frontend/src/context/"),
    ("frontend/src/utils/coursePermissions.ts", f"{PROJECT_ROOT}/frontend/src/utils/"),
    ("frontend/src/utils/duration.ts", f"{PROJECT_ROOT}/frontend/src/utils/"),
    ("frontend/src/utils/youtube.ts", f"{PROJECT_ROOT}/frontend/src/utils/"),
    ("frontend/src/components/DurationInput/DurationInput.tsx", f"{PROJECT_ROOT}/frontend/src/components/DurationInput/"),
    ("frontend/src/components/DurationInput/DurationInput.css", f"{PROJECT_ROOT}/frontend/src/components/DurationInput/"),
    ("frontend/src/components/YouTubeEmbed/YouTubeEmbed.tsx", f"{PROJECT_ROOT}/frontend/src/components/YouTubeEmbed/"),
    ("frontend/src/components/YouTubeEmbed/YouTubeEmbed.css", f"{PROJECT_ROOT}/frontend/src/components/YouTubeEmbed/"),
    ("frontend/src/components/Modal/Modal.tsx", f"{PROJECT_ROOT}/frontend/src/components/Modal/"),
    ("frontend/src/components/Modal/Modal.css", f"{PROJECT_ROOT}/frontend/src/components/Modal/"),
    ("frontend/src/components/LearnersModal/LearnersModal.tsx", f"{PROJECT_ROOT}/frontend/src/components/LearnersModal/"),
    ("frontend/src/components/LearnersModal/LearnersModal.css", f"{PROJECT_ROOT}/frontend/src/components/LearnersModal/"),
    ("frontend/src/components/YouTubePlayer/YouTubePlayer.tsx", f"{PROJECT_ROOT}/frontend/src/components/YouTubePlayer/"),
    ("frontend/src/components/YouTubePlayer/YouTubePlayer.css", f"{PROJECT_ROOT}/frontend/src/components/YouTubePlayer/"),
    ("frontend/src/components/CourseraRichText/CourseraRichText.tsx", f"{PROJECT_ROOT}/frontend/src/components/CourseraRichText/"),
    ("frontend/src/components/CourseraRichText/CourseraRichText.css", f"{PROJECT_ROOT}/frontend/src/components/CourseraRichText/"),
    ("frontend/src/pages/Courses/CoursesPage.tsx", f"{PROJECT_ROOT}/frontend/src/pages/Courses/"),
    ("frontend/src/pages/Courses/CoursesPage.css", f"{PROJECT_ROOT}/frontend/src/pages/Courses/"),
    ("frontend/src/pages/Admin/UserAdminStudio.tsx", f"{PROJECT_ROOT}/frontend/src/pages/Admin/"),
    ("frontend/src/pages/CoursePlayer/CoursePlayer.tsx", f"{PROJECT_ROOT}/frontend/src/pages/CoursePlayer/"),
    ("frontend/src/pages/CoursePlayer/CoursePlayer.css", f"{PROJECT_ROOT}/frontend/src/pages/CoursePlayer/"),
    ("frontend/src/pages/Creator/CourseSyllabus.tsx", f"{PROJECT_ROOT}/frontend/src/pages/Creator/"),
    ("frontend/src/pages/Creator/CreatorDashboard.tsx", f"{PROJECT_ROOT}/frontend/src/pages/Creator/"),
    ("frontend/src/pages/Creator/ExamCreator.tsx", f"{PROJECT_ROOT}/frontend/src/pages/Creator/"),
    ("frontend/src/pages/Creator/ExamReviewer.tsx", f"{PROJECT_ROOT}/frontend/src/pages/Creator/"),
    ("frontend/src/pages/Creator/ModuleEditor.tsx", f"{PROJECT_ROOT}/frontend/src/pages/Creator/"),
    ("frontend/src/pages/Dashboard/Dashboard.tsx", f"{PROJECT_ROOT}/frontend/src/pages/Dashboard/"),
    ("frontend/src/pages/Dashboard/Dashboard.css", f"{PROJECT_ROOT}/frontend/src/pages/Dashboard/"),
    ("frontend/src/pages/Exams/ExamsCenter.tsx", f"{PROJECT_ROOT}/frontend/src/pages/Exams/"),
    ("frontend/src/pages/Login/Login.tsx", f"{PROJECT_ROOT}/frontend/src/pages/Login/"),
    ("frontend/src/pages/Reporting/ReportingDashboard.tsx", f"{PROJECT_ROOT}/frontend/src/pages/Reporting/"),
    ("frontend/src/pages/ViewCourses/ViewCourses.tsx", f"{PROJECT_ROOT}/frontend/src/pages/ViewCourses/"),

    # 8. Frontend Config
    ("frontend/vite.config.ts", f"{PROJECT_ROOT}/frontend/"),

    # 9. Deployment Scripts & Repo Config
    (".gitignore", f"{PROJECT_ROOT}/"),
    ("CHANGELOG.md", f"{PROJECT_ROOT}/"),
    ("setup_backup_db.py", f"{PROJECT_ROOT}/"),
    ("zip_updates.py", f"{PROJECT_ROOT}/"),
]

def main():
    print("=" * 60)
    print(f"🚀 KAIZEN DEPLOYMENT SCRIPT: PUSH TO {SERVER}")
    print(f"   Target Directory: {PROJECT_ROOT}")
    print("=" * 60)

    success_count = 0
    fail_count = 0

    for local_file, remote_dir in FILES_TO_COPY:
        if not os.path.exists(local_file):
            print(f"⚠️  Skipping: '{local_file}' (File not found locally)")
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
        print("-" * 60)

    print("\n📊 Transfer Summary:")
    print(f"   Successful Transfers: {success_count}")
    print(f"   Failed/Skipped: {fail_count}")
    print("=" * 60)
    print("Next Steps on Remote Host:")
    print("1. SSH into the server: ssh " + SERVER)
    print("2. Navigate to directory: cd " + PROJECT_ROOT)
    print("3. Run database migrations: alembic upgrade head")
    print("4. Restart backend: sudo systemctl restart kaizen-backend (or restart docker/pm2)")
    print("5. Rebuild frontend if needed: cd frontend && npm run build")

if __name__ == "__main__":
    main()
