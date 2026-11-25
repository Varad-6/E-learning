# Kaizen LMS — Deployment Phase 2 Specification & Operations Guide

**Branch Reference:** `development-phase-2` / `deployment-phase-2`  
**Latest Revision:** `c70db2bfa5c7` (`add_missing_model_columns`)  
**Package Artifact:** `deployment_phase_2.zip` / `Kaizen_Deployment_Phase2.zip`  
**Target Environment:** Production Host (`192.168.50.55`) & Local Development  
**Base Directory:** `/var/www/kaizen` (Remote) | `C:\Users\arati\OneDrive - Abhiyanta India Solutions Pvt Ltd\Desktop\E-learning` (Local)  

---

## 1. Executive Summary & Phase 2 Scope

Phase 2 introduces critical enterprise LMS infrastructure, database relationship hardening, course module associations, and enhanced frontend learning components.

### Key Capabilities Delivered in Phase 2
1. **Course Module Associations & Flexible Syllabi**:
   - Migration `6a1000000001_create_course_module_associations.py` enabling many-to-many linkages between courses and reusable course modules.
   - Migration `c70db2bfa5c7_add_missing_model_columns.py` adding `video_url` to courses, `last_accessed_at` timestamp to enrollments, and allowing nullable `course_id` on `course_modules`.
2. **Department Isolation & Scoped Filtering**:
   - Migration `5debf6462182_create_course_departments_table.py` supporting multi-department course distribution.
   - Manager and Employee views restricted strictly to their assigned department, with Admin/HR retaining global cross-department management privileges.
3. **Learner Engagement & Rich Learning Modules**:
   - Interactive Learners Modal displaying enrolled users, progress percentages, and completion status.
   - Coursera-style rich text reader component (`CourseraRichText.tsx`) for learning content units.
   - Embedded video player and YouTube sanitizer (`YouTubeEmbed.tsx`, `YouTubePlayer.tsx`).
   - Granular Duration input component (`DurationInput.tsx`) converting HH:MM:SS to seconds seamlessly.
4. **Administrative User Management & Course Assignments**:
   - Direct course assignment endpoints (`/api/users/:id/assign-course`, `/api/users/:id/assignable-courses`).
   - Role promotion workflows (`/api/users/:id/role`) with immutable audit trails in `role_history`.
   - Comprehensive creator backfill script (`app/seeds/backfill_course_creators.py`).

---

## 2. Inventory of Phase 2 Files

### 2.1 Database Migrations (`alembic/versions/`)
- `5debf6462182_create_course_departments_table.py` — Multi-department course association table.
- `6a1000000001_create_course_module_associations.py` — Course-to-module mapping table.
- `c70db2bfa5c7_add_missing_model_columns.py` — Missing model columns (`courses.video_url`, `course_enrollments.last_accessed_at`).
- All 25 baseline Alembic migration revisions up to `c70db2bfa5c7`.
- `alembic/env.py` & `alembic.ini` configured with resilient metadata reflection.

### 2.2 Backend Core & Database
- `app/core/config.py` — Environment configuration and security keys.
- `app/core/dependencies.py` — Role enforcement (`RequireRoles`), current active user extraction, DB session dependency.
- `app/database/session.py` — SQLAlchemy connection pooling and session management.
- `app/main.py` — FastAPI application bootstrap, CORS middleware, router registrations.

### 2.3 Backend Models (`app/models/`)
- `course.py`, `course_module.py`, `course_enrollment.py`, `course_department.py`
- `department.py`, `user.py`, `role.py`, `role_history.py`, `badge_tier.py`
- `quiz.py`, `quiz_question.py`, `user_module_note.py`, `notification.py`

### 2.4 Backend Schemas & Services
- Schemas: `admin.py`, `auth.py`, `badge.py`, `course.py`, `dashboard.py`, `department.py`, `enrollment.py`, `quiz.py`
- Services: `admin_service.py`, `auth_service.py`, `course_service.py`, `dashboard_service.py`, `department_service.py`, `enrollment_service.py`, `module_service.py`, `quiz_service.py`

### 2.5 Backend API Routes (`app/api/`)
- `admin.py`, `auth.py`, `course.py`, `dashboard.py`, `department.py`
- `employee_dashboard.py`, `enrollment.py`, `module.py`, `quiz.py`, `reporting.py`, `user_management.py`

### 2.6 Frontend Components & Pages (`frontend/src/`)
- `components/CourseraRichText/` — Rich learning content renderer
- `components/DurationInput/` — Course & module duration input with unit validation
- `components/LearnersModal/` — Active learner metrics and roster
- `components/Navbar/` — Role-based navigation and live notifications
- `components/YouTubeEmbed/` & `YouTubePlayer/` — Responsive video embedding
- `pages/Admin/UserAdminStudio.tsx` — User management and RBAC studio
- `pages/CoursePlayer/` — Sequential module viewer & lesson player
- `pages/Courses/` — Enterprise course hub & catalog
- `pages/Creator/` — Creator dashboard, course syllabus constructor, module editor
- `pages/Dashboard/` — Glassmorphic analytics dashboards (Admin, Manager, Employee)
- `pages/Exams/` & `pages/Reporting/` — Exam review, grading, and reporting

---

## 3. Remote Server Deployment Procedure (Target: `192.168.50.55`)

### Step 1: Upload Archive to Server
Transfer `deployment_phase_2.zip` directly to the deployment host using SCP:
```bash
scp deployment_phase_2.zip root@192.168.50.55:/var/www/kaizen/
```
*(Alternatively, execute the automated deployment script `python deploy_phase_2.py`)*

### Step 2: SSH into Remote Host & Backup Current State
```bash
ssh root@192.168.50.55
cd /var/www/kaizen

# Create timestamped rollback backup
mkdir -p /var/www/kaizen_backups
tar -czf /var/www/kaizen_backups/backup_pre_phase2_$(date +%F_%T).tar.gz app alembic frontend/src
```

### Step 3: Extract Deployment Package
```bash
unzip -o deployment_phase_2.zip -d /var/www/kaizen/
```

### Step 4: Run Database Migrations
Apply all pending schema migrations up to `c70db2bfa5c7`:
```bash
source /var/www/kaizen/venv/bin/activate
alembic upgrade head
```
*Verify output confirms revision `c70db2bfa5c7` successfully applied.*

### Step 5: Restart Backend Service
```bash
sudo systemctl restart kaizen-backend
sudo systemctl status kaizen-backend --no-pager
```

### Step 6: Build & Deploy Frontend Assets
```bash
cd /var/www/kaizen/frontend
npm install
npm run build
```
*The compiled assets will be placed in `frontend/dist/` ready for Nginx / Caddy reverse proxy serving.*

---

## 4. Local Execution Guide (Windows / OneDrive Workspace)

To test and run the full stack locally:
1. Double-click or run `start_local.bat` in the project root:
   ```cmd
   start_local.bat
   ```
2. The launcher script (`start_local.ps1`) automatically:
   - Starts PostgreSQL on port `5432`
   - Launches FastAPI backend with auto-reload on `http://127.0.0.1:8000` (Docs: `http://127.0.0.1:8000/docs`)
   - Launches Vite frontend dev server on `http://localhost:5180`
   - Opens the browser automatically to the login screen

### Default Credentials
- **System Admin**: `systemadmin@abhiyantatech.com` / `Password123!`
- **Employee**: `Arati.D@abhiyantatech.com` / `Password123!`

---

## 5. Verification Checklist & Smoke Tests

| Step | Test Objective | Expected Result | Verified |
| :---: | :--- | :--- | :---: |
| 1 | Database Migration Status | `alembic current` matches `c70db2bfa5c7` | [x] |
| 2 | FastAPI Documentation | `GET /docs` returns OpenAPI 3.1 schema | [x] |
| 3 | Authentication Login | `POST /api/auth/login` returns valid JWT Bearer token | [x] |
| 4 | Courses Hub Listing | `GET /api/courses` returns published courses | [x] |
| 5 | Course Module Associations | Creating and editing modules reflects correctly in syllabus | [x] |
| 6 | Learners Modal | Learners modal renders with enrollments count | [x] |
| 7 | User Management | `GET /api/users/:id/assignable-courses` functions without 500 error | [x] |

---

## 6. Rollback Procedure

If any regression occurs during remote deployment:
```bash
# 1. Rollback Alembic Migration
alembic downgrade -1

# 2. Restore pre-deployment archive
cd /var/www/kaizen
tar -xzf /var/www/kaizen_backups/backup_pre_phase2_*.tar.gz

# 3. Restart services
sudo systemctl restart kaizen-backend
```
