import zipfile
import os

# List of all files modified/created in this session
FILES_TO_ZIP = [
    # 1. Backend core, configs & services
    "app/core/config.py",
    "app/database/session.py",
    "app/models/course.py",
    "app/services/audit_service.py",
    "app/services/course_service.py",
    "setup_backup_db.py",
    "scratch/clean_database.py",

    # 2. Backend APIs
    "app/api/admin.py",
    "app/api/auth.py",
    "app/api/course.py",
    "app/api/department.py",
    "app/api/employee_dashboard.py",
    "app/api/enrollment.py",
    "app/api/module.py",

    # 3. Frontend core & configs
    "frontend/src/App.tsx",
    "frontend/src/components/Navbar/Navbar.tsx",
    "frontend/src/services/api.ts",
    "frontend/src/styles/theme.css",
    "frontend/vite.config.ts",

    # 4. Frontend pages
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
]

def main():
    zip_filename = "update.zip"
    print("=" * 60)
    print(f"CREATING ARCHIVE: {zip_filename}")
    print("=" * 60)

    added_count = 0
    missing_count = 0

    with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for file_path in FILES_TO_ZIP:
            if os.path.exists(file_path):
                zipf.write(file_path)
                print(f"[ADDED] {file_path}")
                added_count += 1
            else:
                print(f"[MISSING] {file_path}")
                missing_count += 1

    print("=" * 60)
    print(f"Archive created successfully!")
    print(f"   Files added: {added_count}")
    print(f"   Missing/Skipped: {missing_count}")
    print(f"   Archive path: {os.path.abspath(zip_filename)}")
    print("=" * 60)

if __name__ == "__main__":
    main()
