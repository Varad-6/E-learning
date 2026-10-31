import zipfile
import os
import shutil

# Pure Application Code & Migrations for Deployment Handoff
FILES_TO_ZIP = [
    # 1. Database Migrations & Alembic
    "alembic/env.py",
    "alembic/versions/9738474ae94d_optional_courses_quizzes_and_badge_.py",
    "alembic/versions/5debf6462182_create_course_departments_table.py",

    # 2. Backend Core & Database Routing
    "app/core/config.py",
    "app/database/session.py",
    "app/main.py",

    # 3. Backend Models
    "app/models/__init__.py",
    "app/models/badge_tier.py",
    "app/models/course.py",
    "app/models/course_department.py",
    "app/models/course_enrollment.py",
    "app/models/course_module.py",
    "app/models/department.py",
    "app/models/quiz.py",
    "app/models/quiz_question.py",

    # 4. Backend Schemas
    "app/schemas/admin.py",
    "app/schemas/badge.py",
    "app/schemas/course.py",
    "app/schemas/department.py",
    "app/schemas/enrollment.py",
    "app/schemas/quiz.py",

    # 5. Backend Services
    "app/services/admin_service.py",
    "app/services/audit_service.py",
    "app/services/badge_service.py",
    "app/services/course_service.py",
    "app/services/dashboard_service.py",
    "app/services/department_service.py",
    "app/services/enrollment_service.py",
    "app/services/module_service.py",
    "app/services/quiz_service.py",

    # 6. Backend API Routes
    "app/api/admin.py",
    "app/api/auth.py",
    "app/api/course.py",
    "app/api/dashboard.py",
    "app/api/department.py",
    "app/api/employee_dashboard.py",
    "app/api/enrollment.py",
    "app/api/module.py",
    "app/api/quiz.py",
    "app/api/reporting.py",

    # 7. Deployment Script
    "deploy.py",

    # 8. Frontend Source Pages & Components
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
    "frontend/src/utils/youtube.ts",
    "frontend/src/utils/duration.ts",
    "frontend/src/components/DurationInput/DurationInput.tsx",
    "frontend/src/components/DurationInput/DurationInput.css",
    "frontend/src/components/YouTubeEmbed/YouTubeEmbed.tsx",
    "frontend/src/components/YouTubeEmbed/YouTubeEmbed.css",
    "frontend/src/components/Modal/Modal.tsx",
    "frontend/src/components/Modal/Modal.css",
    "frontend/src/components/LearnersModal/LearnersModal.tsx",
    "frontend/src/components/LearnersModal/LearnersModal.css",
    "frontend/src/pages/Courses/CoursesPage.tsx",
    "frontend/src/pages/Courses/CoursesPage.css",
    "frontend/src/components/YouTubePlayer/YouTubePlayer.tsx",
    "frontend/src/components/YouTubePlayer/YouTubePlayer.css",
    "frontend/src/components/CourseraRichText/CourseraRichText.tsx",
    "frontend/src/components/CourseraRichText/CourseraRichText.css",
    "frontend/src/pages/CoursePlayer/CoursePlayer.css",
    "frontend/src/components/Navbar/Navbar.css",
    "frontend/src/pages/Dashboard/Dashboard.css",

    # 9. Frontend Config
    "frontend/vite.config.ts",
]

def get_desktop_path():
    userprofile = os.environ.get("USERPROFILE", "")
    onedrive_desktop = os.path.join(userprofile, "OneDrive - Abhiyanta India Solutions Pvt Ltd", "Desktop")
    if os.path.exists(onedrive_desktop):
        return onedrive_desktop
    regular_desktop = os.path.join(userprofile, "Desktop")
    if os.path.exists(regular_desktop):
        return regular_desktop
    return None

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

        # Add pre-built production frontend dist assets if present
        if os.path.exists("frontend/dist"):
            print("  + Packaging frontend/dist production bundle...")
            for root, _, files in os.walk("frontend/dist"):
                for file in files:
                    full_p = os.path.join(root, file)
                    rel_p = os.path.relpath(full_p, ".")
                    zipf.write(full_p, arcname=rel_p)
                    added_count += 1

    print("=" * 60)
    print(f"SUCCESS: Created local {zip_filename} with {added_count} files ({missing_count} missing)")

    desktop = get_desktop_path()
    if desktop:
        desktop_zip = os.path.join(desktop, "Kaizen_Deployment_Updates.zip")
        try:
            shutil.copy2(zip_filename, desktop_zip)
            print(f"[SUCCESS] Also saved to Desktop: {desktop_zip}")
        except Exception as e:
            print(f"[WARNING] Could not copy to Desktop ({desktop_zip}): {e}")
    else:
        print("[WARNING] Could not locate Desktop path.")
    print("=" * 60)

if __name__ == "__main__":
    main()
