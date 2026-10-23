import subprocess
import os

# Configuration
SERVER = "root@192.168.50.55"
PROJECT_ROOT = "/var/www/kaizen"

# List of files to copy: (local_relative_path, remote_target_directory)
FILES_TO_COPY = [
    # 1. Backend python files
    ("app/api/course.py", f"{PROJECT_ROOT}/app/api/"),
    ("app/api/employee_dashboard.py", f"{PROJECT_ROOT}/app/api/"),
    ("app/models/course.py", f"{PROJECT_ROOT}/app/models/"),
    ("app/services/course_service.py", f"{PROJECT_ROOT}/app/services/"),

    # 2. Frontend core & configs
    ("frontend/src/App.tsx", f"{PROJECT_ROOT}/frontend/src/"),
    ("frontend/src/components/Navbar/Navbar.tsx", f"{PROJECT_ROOT}/frontend/src/components/Navbar/"),
    ("frontend/src/services/api.ts", f"{PROJECT_ROOT}/frontend/src/services/"),
    ("frontend/src/styles/theme.css", f"{PROJECT_ROOT}/frontend/src/styles/"),
    ("frontend/vite.config.ts", f"{PROJECT_ROOT}/frontend/"),

    # 3. Frontend pages
    ("frontend/src/pages/Admin/UserAdminStudio.tsx", f"{PROJECT_ROOT}/frontend/src/pages/Admin/"),
    ("frontend/src/pages/CoursePlayer/CoursePlayer.tsx", f"{PROJECT_ROOT}/frontend/src/pages/CoursePlayer/"),
    ("frontend/src/pages/Creator/CourseSyllabus.tsx", f"{PROJECT_ROOT}/frontend/src/pages/Creator/"),
    ("frontend/src/pages/Creator/CreatorDashboard.tsx", f"{PROJECT_ROOT}/frontend/src/pages/Creator/"),
    ("frontend/src/pages/Creator/ExamCreator.tsx", f"{PROJECT_ROOT}/frontend/src/pages/Creator/"),
    ("frontend/src/pages/Creator/ExamReviewer.tsx", f"{PROJECT_ROOT}/frontend/src/pages/Creator/"),
    ("frontend/src/pages/Creator/ModuleEditor.tsx", f"{PROJECT_ROOT}/frontend/src/pages/Creator/"),
    ("frontend/src/pages/Dashboard/Dashboard.tsx", f"{PROJECT_ROOT}/frontend/src/pages/Dashboard/"),
    ("frontend/src/pages/Exams/ExamsCenter.tsx", f"{PROJECT_ROOT}/frontend/src/pages/Exams/"),
    ("frontend/src/pages/Login/Login.tsx", f"{PROJECT_ROOT}/frontend/src/pages/Login/"),
    ("frontend/src/pages/Reporting/ReportingDashboard.tsx", f"{PROJECT_ROOT}/frontend/src/pages/Reporting/"),
    ("frontend/src/pages/ViewCourses/ViewCourses.tsx", f"{PROJECT_ROOT}/frontend/src/pages/ViewCourses/"),
]

def main():
    print("=" * 60)
    print(f"🚀 KAIZEN DEPLOYMENT SCRIPT: PUSH TO {SERVER}")
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
            # Run SCP command
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
    print("Next Steps:")
    print("1. Go to your server SSH terminal.")
    print("2. Navigate to your project directory: cd /var/www/kaizen")
    print("3. Restart your backend and frontend service/containers.")

if __name__ == "__main__":
    main()
