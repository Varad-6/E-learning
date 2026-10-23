import zipfile
import os

# Pure Application Code & Migrations for Deployment Handoff
FILES_TO_ZIP = [
    # 1. Database Migrations & Alembic
    "alembic/env.py",
    "alembic/versions/9738474ae94d_optional_courses_quizzes_and_badge_.py",

    # 2. Backend Core & Database Routing
    "app/core/config.py",
    "app/database/session.py",

    # 3. Backend Models
    "app/models/badge_tier.py",
    "app/models/course.py",
    "app/models/course_module.py",
    "app/models/quiz.py",
    "app/models/quiz_question.py",

    # 4. Backend Schemas
    "app/schemas/admin.py",
    "app/schemas/badge.py",
    "app/schemas/course.py",
    "app/schemas/quiz.py",

    # 5. Backend Services
    "app/services/admin_service.py",
    "app/services/audit_service.py",
    "app/services/badge_service.py",
    "app/services/course_service.py",
    "app/services/enrollment_service.py",
    "app/services/quiz_service.py",

    # 6. Backend API Routes
    "app/api/admin.py",
    "app/api/auth.py",
    "app/api/course.py",
    "app/api/department.py",
    "app/api/employee_dashboard.py",
    "app/api/enrollment.py",
    "app/api/module.py",

    # 7. Frontend Source Pages & Components
    "frontend/src/App.tsx",
    "frontend/src/components/Navbar/Navbar.tsx",
    "frontend/src/pages/Admin/UserAdminStudio.tsx",
    "frontend/src/pages/CoursePlayer/CoursePlayer.tsx",
    "frontend/src/pages/Creator/CourseSyllabus.tsx",
    "frontend/src/pages/Creator/CreatorDashboard.tsx",
    "frontend/src/pages/Creator/ExamCreator.tsx",
    "frontend/src/pages/Creator/ExamReviewer.tsx",
    "frontend/src/pages/Creator/ModuleEditor.tsx",
    "frontend/src/pages/Dashboard/Dashboard.tsx",
    "frontend/src/pages/Exams/ExamsCenter.tsx",
    "frontend/src/pages/Login/Login.tsx",
    "frontend/src/pages/Reporting/ReportingDashboard.tsx",
    "frontend/src/pages/ViewCourses/ViewCourses.tsx",
    "frontend/src/services/api.ts",
    "frontend/src/styles/theme.css",

    # 8. Frontend Config
    "frontend/vite.config.ts",
]

def main():
    zip_filename = "update.zip"
    print("=" * 60)
    print(f"CREATING PRODUCTION CODE HANDOFF ARCHIVE: {zip_filename}")
    print("=" * 60)

    added_count = 0
    missing_count = 0

    with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for file_path in FILES_TO_ZIP:
            if os.path.exists(file_path):
                zipf.write(file_path, arcname=file_path)
                print(f"  + Added: {file_path}")
                added_count += 1
            else:
                print(f"  ! Missing: {file_path}")
                missing_count += 1

        # Add pre-built production frontend dist assets
        if os.path.exists("frontend/dist"):
            print("  + Packaging frontend/dist production bundle...")
            for root, _, files in os.walk("frontend/dist"):
                for file in files:
                    full_p = os.path.join(root, file)
                    rel_p = os.path.relpath(full_p, ".")
                    zipf.write(full_p, arcname=rel_p)
                    added_count += 1

    print("=" * 60)
    print(f"SUCCESS: Created {zip_filename} with {added_count} files ({missing_count} missing)")
    print("=" * 60)

if __name__ == "__main__":
    main()
