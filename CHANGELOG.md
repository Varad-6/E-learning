# Changelog

All notable changes to the Kaizen LMS project will be documented in this file.

## [2026-07-23] Kiezen LMS - HR Manager Unscoped All-Department Access Pass
- Problem: HR Managers (`hr.mgr1@lms.com`, role `COURSE_MANAGER` in `HR` department) needed to see ALL departments identically to Admin, unlocking all-department views, User Studio, Creator Studio, and global analytics.
- Changed:
  - `app/api/dashboard.py`: Updated `get_manager_dept_id()` to return `None` (unscoped, all-departments view) if `current_user` belongs to the `HR` department.
  - `app/api/reporting.py`: Updated `is_global_admin` check to treat HR department managers as global admins, granting full visibility across all departments.
  - `app/api/leaderboard.py`: Updated `is_manager` check to treat HR department managers as global admins (unscoped view of global leaderboard and all departments).
  - `app/core/dependencies.py`: Updated `RequireRoles` dependency to automatically grant HR department managers access to any endpoint permitting Admin/HR roles.
  - `frontend/src/pages/Login/Login.tsx`: Mapped HR department managers to `'HR Manager'`, giving them identical workspace access to Admin.
  - `frontend/src/components/Navbar/Navbar.tsx`: Enabled User Studio, Creator Studio, and Reporting navigation links for `'HR Manager'`.
  - `frontend/src/pages/Dashboard/Dashboard.tsx`: Enabled full Admin Analytics View, audit logs, and all-department metrics for `'HR Manager'`.
  - `frontend/src/pages/Creator/CreatorDashboard.tsx`: Included `'HR Manager'` in `isAdmin` check for all-department course management, approvals, and publishing controls.
  - `frontend/src/pages/Admin/UserAdminStudio.tsx`: Allowed `'HR Manager'` access to User & Department Administration studio.
- Tests added: Updated `scratch/tmp_verify_final.py` (51 automated test cases, 100% green).
- Migration: No.
- Known risk/follow-up: None. HR Managers have full cross-department access with distinct role identity.

## [2026-07-23] Kiezen LMS - HR Role Full Equivalence to Admin Pass
- Problem: The HR role (`HR_ADMIN`) required full capability equivalence to System Admin (`SYSTEM_ADMIN`) across all system views, navigation links, CRUD actions, and cross-department analytics, while preserving distinct role identity for display and audit log attribution.
- Changed:
  - `app/api/admin.py`: Updated `RequireRoles("SYSTEM_ADMIN")` to `RequireRoles("SYSTEM_ADMIN", "HR_ADMIN")` on user role assignment endpoint.
  - `app/api/audit.py`: Updated `RequireRoles("SYSTEM_ADMIN")` to `RequireRoles("SYSTEM_ADMIN", "HR_ADMIN")` on `/api/admin/audit-logs`.
  - `app/api/department.py`: Updated `RequireRoles("SYSTEM_ADMIN")` to `RequireRoles("SYSTEM_ADMIN", "HR_ADMIN")` on department creation, update, and deletion endpoints.
  - `app/api/course.py`: Updated `RequireRoles("SYSTEM_ADMIN", "COURSE_MANAGER")` to include `"HR_ADMIN"` across course creation, update, deletion, approval, rejection, and publishing endpoints.
  - `app/api/enrollment.py`: Added `"HR_ADMIN"` to `RequireRoles` for manager roster and enrollment unlock endpoints.
  - `app/api/module.py` & `app/api/quiz.py`: Added `"HR_ADMIN"` to `RequireRoles` across all module and quiz management endpoints.
  - `app/api/exam.py`: Updated all exam management, submission routing, review approval/rejection, and unscoped listing endpoints to treat `HR_ADMIN` as a global admin role alongside `SYSTEM_ADMIN`.
  - `frontend/src/pages/Login/Login.tsx`: Mapped `HR_ADMIN` to `'HR Admin'` display role string to preserve role identity while unlocking admin-equivalent views.
  - `frontend/src/components/Navbar/Navbar.tsx`: Granted `'HR Admin'` access to "Creator Studio", "User Studio", and "Reporting" navigation items.
  - `frontend/src/pages/Admin/UserAdminStudio.tsx`: Updated route guard to permit `'HR Admin'` full access to department and user administration.
  - `frontend/src/pages/Creator/CreatorDashboard.tsx`: Updated `isAdmin` check to include `'HR Admin'` for global course management and approval cards.
  - `frontend/src/pages/Dashboard/Dashboard.tsx`: Enabled `'HR Admin'` full access to System Analytics dashboard with distinct "HR Admin Workspace" header badge.
- Tests added: Updated `scratch/tmp_verify_final.py` (48 automated test cases, 100% green).
- Migration: No.
- Known risk/follow-up: None. HR role has full system capabilities with distinct audit attribution.

## [2026-07-23] Kiezen LMS - Full System Audit & Production Readiness Pass
- Problem: Deep verification pass across database, backend APIs, frontend, cross-role scoping, and Docker compose stack to eliminate compounding regressions, missing migrations, CORS gaps, and path mismatches.
- Changed:
  - Database & Migrations: Ran `alembic upgrade head` to apply all 16 pending migrations. Added missing tables (`notifications`, `user_badges`, `badge_tiers`, `audit_logs`, `exam_assignments`, `exam_grades`, `exam_questions`, `exam_reviews`, `exam_submissions`, `user_module_notes`). Re-seeded full dataset (26 users across 4 departments with SYSTEM_ADMIN, HR_ADMIN, COURSE_MANAGER, EMPLOYEE roles, 8 published courses, 20 badge tiers).
  - CORS & Backend: Injected CORS headers directly into FastAPI exception handlers in `app/main.py` (`StarletteHTTPException`, `RequestValidationError`, `global_exception_handler`) to ensure errors return CORS headers and don't trigger browser block.
  - Frontend API Integration: Updated `API_BASE_URL` in `frontend/src/services/api.ts` to dynamically target host port `8080` for Docker environment compatibility.
  - Navbar: Reduced notification polling interval to 60s and silenced background network fetch errors.
  - Docker Compose: Validated full containerized build and execution via `docker compose up --build -d`.
- Tests added: `scratch/tmp_verify_final.py` (45 automated E2E endpoint test cases covering all 4 roles).
- Migration: Yes (`alembic upgrade head`).
- Known risk/follow-up: None. 100% (45/45) automated tests passed against the containerized stack.

## [2026-07-23] Kaizen Design System - Color Token Migration
- Problem: The UI needed to migrate color tokens site-wide (across all roles, modules, and sub-views) to align with the "Kaizen Design System" (neutral-dominant with Indigo primary accent and oklch status colors). This migration is colors only: layout, structures, and functionality must remain completely unchanged.
- Changed:
  - `frontend/src/styles/theme.css`:
    - Defined custom properties for the neutral grays scale (`--neutral-50` to `--neutral-950`).
    - Configured Indigo primary accent (`--color-accent-primary: oklch(0.52 0.19 275)`), status colors, and chart data-series (`--color-chart-1` to `--color-chart-5`).
    - Standardized focus rings to use `var(--accent-glow)`.
  - `frontend/src/components/Button/Button.css`:
    - Updated primary fill and hover button styles to use the new primary indigo accents.
  - `frontend/src/components/Input/Input.css`, `frontend/src/pages/Login/Login.css`, `frontend/src/pages/Dashboard/Dashboard.css`:
    - Cleaned up hardcoded focus ring colors to consume `var(--accent-glow)`.
    - Rewrote `.dashboard-hero-banner` background glows using the new indigo accent.
  - `frontend/src/pages/Dashboard/Dashboard.tsx`:
    - Modified donut charts, bar charts, and courses lists to maps colors sequentially using the new `chartPalette` array.
  - `frontend/src/pages/Exams/ExamsCenter.tsx`, `frontend/src/pages/Leaderboard/Leaderboard.tsx`, `frontend/src/pages/Reporting/ReportingDashboard.tsx`, `frontend/src/pages/Creator/Creator.css`:
    - Swapped all hardcoded checkmark, rank delta, status badge, and progress color tones with their respective token custom properties (`var(--success-color)`, `var(--warning-color)`, `var(--danger-color)`).
- Tests added: Clean build compiled successfully (`npm run build`).
- Migration: No
- Known risk/follow-up: None

## [2026-07-23] Simplify Manager Dashboard (Analytics Only)
- Problem: The manager's dashboard needed to be streamlined to show only department analytics. Extra tabs (Syllabus Catalog, Creator Sandbox, Employee Roster), tab switchers, and the redundant "Analytics Dashboard" subview header were cluttering the UI. The "Pending Approvals" stat card was also redundant here.
- Changed:
  - `frontend/src/pages/Dashboard/Dashboard.tsx`:
    - Removed the tab switcher button layout from the manager's header console node.
    - Set the initial `managerSubView` state to `'analytics'`.
    - Cleaned up the file by removing the markup blocks for `my_courses`, `create_course`, and `audit_reporting` subviews.
    - Removed the "Pending Approvals" card from the manager's analytics summary grid.
- Tests added: Clean build compiled successfully (`npm run build`).
- Migration: No
- Known risk/follow-up: None

## [2026-07-23] UI Theme Update: Premium Enterprise Soft Glassmorphism Dark Mode
- **Problem**:
  - The application visual layout needed to be transformed into a premium enterprise Soft Glassmorphism Dark Theme (Apple VisionOS + Linear + Vercel + Microsoft Fluent design style) while keeping the original layout, margins, padding, and functionality completely identical.
- **Changed**:
  - `frontend/src/styles/theme.css`:
    - Changed `--color-bg-glow` to a premium deep layered gradient with soft green and blue radial glow elements at top-left and bottom-right corners.
    - Updated `--color-surface` to use a soft linear gradient overlay (`linear-gradient(145deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02))`).
    - Standardized glass parameters: backdrop-filter blur (`18px`), borders (`rgba(255, 255, 255, 0.08)`), shadows (`0 10px 40px rgba(0, 0, 0, 0.35), inset 0 1px rgba(255, 255, 255, 0.04)`).
    - Mapped primary accent color (KAIZEN Green) to `#18D38A` (hover `#22E89C`, glow `rgba(24, 211, 138, 0.25)`).
    - Set secondary blue accent to `#4C7DFF` and secondary purple accent to `#8B7CFF`.
    - Defined text colors (Primary: `#F8FAFC`, Secondary: `#CBD5E1`, Muted: `#94A3B8`, Disabled: `#64748B`).
    - Configured glass panel hover animations (lifts translateY `-3px`, deepens shadow to `rgba(0, 0, 0, 0.45)`, transitions with `250ms ease`).
    - Applied green focus rings to input fields (`0 0 0 3px rgba(24, 211, 138, 0.18)`).
  - `frontend/src/components/Button/Button.css`:
    - Re-styled primary buttons to consume KAIZEN Green gradient (`#18D38A` to `#12B876`), 12px border radius, and a subtle glowing hover shadow.
  - `frontend/src/components/Navbar/Navbar.css`:
    - Updated dark navbar header to use `rgba(18, 22, 30, 0.75)` with `20px` blur.
    - Added green underline with soft glow active tab highlight styles.
  - `frontend/src/pages/Dashboard/Dashboard.css`:
    - Designed the Welcome Banner hero card as a premium glass pane with subtle green and blue radial lights, large blur, and an elegant shadow.
- **Tests added**:
  - Production Vite build successfully compiled (`npm run build` completed).
- **Migration**: No
- **Known risk/follow-up**: None (Changes kept uncommitted locally per user instruction).

## [2026-07-23] Dark Mode Color Correction & Top Navbar Layout Restoration
- **Problem**:
  - The previous glassmorphism dark theme implementation leaned too green/greenish overall with a green tint/cast in the backgrounds and card surfaces.
  - The navigation layout needed to be restored to the top navbar layout ("upside") as it was earlier, rather than the left sidebar layout.
- **Changed**:
  - Restored original Top Navbar navigation layout ("upside") and removed the left sidebar navigation components/files.
  - Corrected dark theme variables in `theme.css`:
    - Changed base background (`--color-bg`) to a neutral black-to-deep-blue-to-grey gradient (`#0a0b0f` base background with `#0a0b0f` → `#12141c` → `#1a1d26` range and cool purple/blue radial glow; zero green tint).
    - Corrected card surface (`--color-surface`) to a neutral cool-grey/blue-black translucent background (`rgba(26, 29, 38, 0.45)`) and border (`rgba(255, 255, 255, 0.08)`).
    - Kept green only as a minority accent (`--color-accent-primary` set to `#2ee6a6`) for positive/active highlights (donut completion ring, sidebar active nav highlights, trend lines/sparklines).
    - Kept purple (`var(--color-accent-secondary)`), blue (`var(--color-accent-info)`), and pink/red (`var(--color-accent-danger)`) accents exactly as-is without shift towards green.
    - Verified text colors (`--color-text-primary`: `#f8fafc`, `--color-text-secondary`: `#8b93a7`) read as neutral white/grey with zero mint tint.
    - Preserved intended distinct badge backgrounds (green for book icon, purple for users icon, blue for pending approvals icon) at low opacity tints.
  - Integrated tiny trend Sparklines inside dashboard stat cards reflecting real recent-trend data.
  - Verified WCAG AA contrast compliance (exceeding 4.5:1 for body text and 3:1 for graphical elements).
- **Tests added**:
  - Production Vite build (`npm run build` completed successfully).
- **Migration**: No
- **Known risk/follow-up**: None (Changes kept uncommitted locally per user instruction).

## [2026-07-22] User Detail Modal Compact Row-Based Restyling Pass
- **Problem**:
  - User detail modals (Admin's User Analytics Modal and Manager's Roster Audit Modal) were oversized, featured excessive vertical padding, used heavy stat panels, and had full-width stretched footer buttons.
- **Changed**:
  - Consolidated user details modals to match a compact, high-density row-based layout (Image 2 reference).
  - `frontend/src/pages/Admin/UserAdminStudio.tsx`:
    - Reduced modal `maxWidth` from `600px` to `460px`.
    - Added initials-based user avatar next to the name/email header via the `icon` prop.
    - Replaced the large cards layout with a tight list of key-value row items.
    - Converted footer actions to inline compact layout: left-aligned red-outlined delete button and right-aligned close button.
  - `frontend/src/pages/Dashboard/Dashboard.tsx`:
    - Migrated Manager's roster audit custom overlay to use the shared `<Modal>` component.
    - Reduced `maxWidth` to `460px` and added initials avatar in header.
    - Re-styled score marks to render as high-density list items and updated the footer button to match.
- **Tests added**:
  - Production Vite build (`npm run build` completed in 3.41s with 0 errors).
  - Rebuilt Docker containers (`docker compose up -d --build frontend`).
- **Migration**: No
- **Known risk/follow-up**: None (Changes kept uncommitted locally per user instruction).

## [2026-07-22] User Studio Detail Modal Loading & Error Handling Pass
- **Problem**:
  - The User Analytics Modal in `UserAdminStudio.tsx` flashed zero values and empty-state placeholders on fetch failure or during API loading transitions instead of displaying loading and error-banner states.
- **Changed**:
  - `frontend/src/pages/Admin/UserAdminStudio.tsx`:
    - Added `modalError` state tracking to handle API errors and network timeouts.
    - Updated `handleOpenUserModal` to catch and set detailed error messages on response failures.
    - Added a premium retry-enabled warning banner conditional overlay in the modal body on fetch failure, eliminating silent zero-value fallbacks.
- **Tests added**:
  - Production Vite build (`npm run build` completed in 2.62s with 0 errors).
  - Rebuilt Docker containers (`docker compose up -d --build frontend`).
- **Migration**: No
- **Known risk/follow-up**: None (Changes kept uncommitted locally per user instruction).

## [2026-07-22] Candidate Analytics Dynamic Contracts & Department Reporting Card Cleanup
- **Problem**:
  - The User Studio Analytics modal displayed blank stats for completed courses and average score due to a contract mismatch (frontend requested `courses_data`/`exams_data` while backend returned `courses`/`exams`).
  - Reporting department overview cards contained redundant metadata rows ("Courses Completed" and "In Progress").
  - The Level 3 Individual Employee profile page in Reporting Dashboard lacked the rich, dynamic completion, average score, and badge achievements layout.
- **Changed**:
  - `frontend/src/pages/Admin/UserAdminStudio.tsx`: Remapped analytics modal variables to read `userProfileData.courses` and `userProfileData.exams` directly.
  - `frontend/src/pages/Reporting/ReportingDashboard.tsx`:
    - Removed `Courses Completed` and `In Progress` status rows from Level 1 department overview cards.
    - Upgraded Level 3 profile view with three gorgeous analytics panels: Courses Completed (with Total Enrolled), Average Exam Score (with Exams Attempted), and Earned Achievements Badge.
- **Tests added**:
  - Production Vite build (`npm run build` completed in 5.40s with 0 errors).
  - Rebuilt Docker containers (`docker compose up -d --build frontend`).
- **Migration**: No
- **Known risk/follow-up**: None (Changes kept uncommitted locally per user instruction).

## [2026-07-21] Create Department Dedicated Tab View Pass
- **Problem**:
  - Creating a department was triggered via a popup modal, whereas creating a user opened a dedicated tab page (`activeTab === 'create_user'`) in `UserAdminStudio.tsx`.
- **Changed**:
  - `frontend/src/pages/Admin/UserAdminStudio.tsx`: Converted Create Department from a popup modal to a dedicated tab view (`activeTab === 'create_department'`) matching `create_user` layout, keeping all existing fields (Department Code, Department Name, Description Optional) and automatically navigating back to `Departments` tab on creation success.
- **Tests added**:
  - Production Vite build (`npm run build` completed in 2.61s with 0 errors).
  - Rebuilt Docker containers (`docker compose up -d --build frontend`).
- **Migration**: No
- **Known risk/follow-up**: None (Changes kept uncommitted locally per user instruction).

## [2026-07-21] Modal & Exam Creation Visual Polish & Subtitle Pass
- **Problem**:
  - `CreatorDashboard.tsx` Create Course modal lacked a subtitle ("Configure initial details for a new learning pathway") and title icon, causing visual disparity with `UserAdminStudio.tsx` Create Department modal.
  - `ExamCreator.tsx` target department select options lacked `[{code}] {name}` formatting and required asterisks.
- **Changed**:
  - `frontend/src/pages/Creator/CreatorDashboard.tsx`: Added `subtitle="Configure initial details for a new learning pathway"` and `BookOpen` icon to Create Course Option modal.
  - `frontend/src/pages/Admin/UserAdminStudio.tsx`: Added `Building2` icon to Create New Department modal.
  - `frontend/src/pages/Creator/ExamCreator.tsx`: Added mandatory field asterisks and formatted department dropdown options as `[{d.code}] {d.name}`.
- **Tests added**:
  - Production Vite build (`npm run build` completed in 3.39s with 0 errors).
  - Rebuilt Docker containers (`docker compose up -d --build frontend`).
- **Migration**: No
- **Known risk/follow-up**: None (Changes kept uncommitted locally per user instruction).

## [2026-07-21] Create Course Modal Sizing, Proportions & Scrollbar Overflow Pass
- **Problem**:
  - The "Create Course Option" modal in `CreatorDashboard.tsx` had an oversized shell width (`maxWidth="620px"`) compared to the compact Department modal (`500px`), rendered an accidental horizontal scrollbar above the action footer, and had raw scrollbar track styling that visually collided with form input corners.
- **Changed**:
  - `frontend/src/components/Modal/Modal.css`: Added `overflow-x: hidden !important`, `box-sizing: border-box !important`, and custom 6px webkit-scrollbar styling (rounded thumb, subtle track padding) to `.modal-body-scroll-zone`.
  - `frontend/src/pages/Creator/CreatorDashboard.tsx`: Set `Create Course Option` modal `maxWidth` to `540px` for matching proportions with the Department modal.
  - `frontend/src/pages/Creator/Creator.css`: Enforced `box-sizing: border-box !important`, `max-width: 100% !important`, and `resize: vertical !important` on `.form-input-styled`, `.form-textarea-styled`, and `.form-select-styled`.
- **Tests added**:
  - Production Vite build (`npm run build` completed in 3.00s with 0 errors).
  - Rebuilt Docker containers (`docker compose up -d --build frontend`).
- **Migration**: No
- **Known risk/follow-up**: None (Changes kept uncommitted locally per user instruction).

## [2026-07-21] Shared Reusable Modal Component (Sticky Header + Internal Scroll Body + Sticky Footer)
- **Problem**:
  - Previous modal dialogs (Create Course, Create Department, Add User, Rejection Feedback, User Profile Detail, Module View) scrolled as a single un-contained block. Tall form inputs caused the modal title header and action buttons to scroll away out of view.
- **Changed**:
  - Created `frontend/src/components/Modal/Modal.tsx` & `Modal.css`: Standardized 3-zone modal shell architecture (`max-height: 85vh; display: flex; flex-direction: column; overflow: hidden`) with sticky pinned header (`flex-shrink: 0`), sticky pinned footer (`flex-shrink: 0`), and independent internal scrollable body (`flex: 1 1 auto; min-height: 0; overflow-y: auto`).
  - Migrated `CreatorDashboard.tsx` (`isCreateModalOpen`, `rejectionCourse`), `UserAdminStudio.tsx` (`showCreateDeptModal`, `selectedUser`, `showDeleteConfirm`), `Dashboard.tsx` (`selectedCourseForModules`), and `CoursePlayer.tsx` (`showTimeUpModal`) to consume the shared `<Modal>` component.
- **Tests added**:
  - Production Vite build (`npm run build` completed cleanly in 2.86s).
  - Rebuilt and restarted Docker containers (`docker compose up -d --build frontend`).
- **Migration**: No
- **Known risk/follow-up**: None

## [2026-07-21] Modal Top Clearance, Dynamic Department Selects & Tab Typography Pass
- **Problem**:
  - `theme.css`: Flex centering (`align-items: center`) with `padding-top: 80px` pushed the tops of tall modals (`max-height: 85vh`) upward behind the fixed 64px navbar.
  - `CreatorDashboard.tsx`: Create Course modal target department dropdown initialized with static fallback text (`AI`) instead of formatting options live from `/api/departments`.
  - `Creator.css`: Filter tab headers ("All Courses", "My Created Courses") used small `0.9rem` text size.
- **Changed**:
  - `frontend/src/styles/theme.css`: Updated `.modal-overlay` to `align-items: flex-start`, `padding: 100px 20px 40px 20px`, and `.modal-content` to `max-height: calc(100vh - 140px)` for guaranteed navbar clearance app-wide.
  - `frontend/src/pages/Creator/CreatorDashboard.tsx`: Formatted target department select options live as `[{d.code}] {d.name}`.
  - `frontend/src/pages/Creator/Creator.css`: Upgraded `.sidebar-tab-btn` typography scale to `1.15rem` with bold (`800`) font weight and active pill background highlights.
- **Tests added**:
  - Production Vite build (`npm run build` completed cleanly in 3.20s).
  - Rebuilt and restarted Docker containers (`docker compose up -d --build frontend`).
- **Migration**: No
- **Known risk/follow-up**: None

## [2026-07-21] Multi-Role System-Wide Audit & UI/UX Backfill Pass
- **Problem**:
  - `seed_db.py`: System Admin user was seeded with `department_id` pointing to HR, causing Admin's dashboard to display "HR DEPARTMENT". System Admin is non-departmental.
  - `Dashboard.tsx`: Hero banner identity badges showed generic tags and contained an un-backed "System Status / Cluster Nodes" stat card.
  - `theme.css`: Select elements lacked global text-overflow truncation rules, causing long department/course names to overflow.
  - `app/api/reporting.py`: Reporting endpoints enforced `"SYSTEM_ADMIN"` or `"COURSE_MANAGER"` checks and excluded `HR_ADMIN` and `EMPLOYEE`.
- **Changed**:
  - `seed_db.py`: Updated `admin_user` to set `department_id=None`. Re-seeded database.
  - `frontend/src/pages/Dashboard/Dashboard.tsx`: Updated hero banner identity tags for all 4 roles (System Admin = "System Admin Workspace" with no dept badge; HR = "HR Workspace" + HR Dept; Manager = "Department Head Workspace" + assigned Dept; Employee = "Employee Workspace" + assigned Dept). Replaced "Cluster Nodes" card with "Active Personnel" / "Active Courses" across all roles.
  - `frontend/src/styles/theme.css`: Added global `select` text-overflow ellipsis rules and standardized `.modal-overlay` (`z-index: 2000; padding: 80px 20px 20px 20px; overflow-y: auto;`) and `.modal-content` (`max-height: 85vh; overflow-y: auto;`).
  - `app/api/reporting.py`: Allowed `HR_ADMIN` and `EMPLOYEE` access to reporting endpoints with appropriate department scoping.
  - `frontend/src/pages/Creator/CreatorDashboard.tsx`: Scoped course catalog to department level for Course Managers while retaining global view for System Admin & HR Admin.
- **Tests added**:
  - Executed `scratch/test_all_roles_verification.py` verifying 20 endpoints across `SYSTEM_ADMIN`, `HR_ADMIN`, `COURSE_MANAGER`, and `EMPLOYEE`.
  - Re-built frontend with `npm run build` (5.22s, 0 errors).
  - Rebuilt and restarted Docker containers (`docker compose up -d --build`).
- **Migration**: No
- **Known risk/follow-up**: None

## [2026-07-20] UI Visual Fixes from Screenshots
- **Problem**:
  - `ExamCreator.tsx`: Right sidebar header read "Syllabus Settings", question button read "+ Add Question to Exam Template", and `[Publish Exam]` button overflowed off the bottom of the card.
  - `CreatorDashboard.tsx`: Selecting a department card (e.g. Artificial Intelligence) showed `Showing 0 courses` / `No Courses Found` despite `TOTAL CREATED: 8` due to strict case-sensitive name string matching omitting `department_id`.
  - `UserAdminStudio.css`: Modal overlay `top: 0` positioning caused the "Create New Department" modal to slide under the navbar header.
- **Changed**:
  - `frontend/src/pages/Creator/ExamCreator.tsx`: Updated sidebar header to "⚙️ Exam Settings", button to "+ Add Question to Exam", and button text to "🚀 Publish Exam". Fixed vertical spacing and padding.
  - `frontend/src/pages/Creator/CreatorDashboard.tsx`: Added `department_id` to mapped course objects and updated department filtering in `filteredMyCourses` and `deptCourseCount` to match on `department_id` or case-insensitive name/code.
  - `frontend/src/pages/Admin/UserAdminStudio.css`: Updated `.modal-overlay` with `z-index: 2000`, `padding-top: 80px`, and `overflow-y: auto` so popups render centered below the navbar without clipping.
- **Tests added**:
  - Verified production Vite build (`npm run build` completed cleanly in 2.89s).
  - Rebuilt and restarted Docker containers (`docker compose up -d --build frontend`).
- **Migration**: No
- **Known risk/follow-up**: None

## [2026-07-20] Final Polish Pass & Full End-to-End System Verification
- **Problem**:
  - Dashboard contained quick stat cards ("Pending Approvals", "System Health", "Top Performers").
  - Obsolete "syllabus" text references lingered in exam creation and review interfaces.
  - Creator Studio lacked a direct "All Departments" option for System Admin to view 100% of historical courses.
  - Notification clearing was local-only, causing unread notifications to reappear on 15-second polling intervals and toasts to stack.
  - User detail modal lacked an explicit soft-delete user action with confirmation dialog.
  - Department creation did not notify application-wide department dropdowns to refresh instantly.
  - Reporting view contained a redundant "Course Completion Progress" section.
- **Changed**:
  - `frontend/src/pages/Dashboard/Dashboard.tsx`: Replaced 3 quick stat cards with "Top Performing Department" card displaying top department, average score, and completion rate from `deptPerformanceData`.
  - `frontend/src/pages/Creator/ExamCreator.tsx` & `ExamReviewer.tsx` & `app/api/exam.py`: Cleaned up text references from "Exam Syllabus" to "Exam".
  - `frontend/src/pages/Creator/CreatorDashboard.tsx`: Fixed exam card layout/alignment and added "All Departments" option card for System Admin.
  - `frontend/src/context/ToastContext.tsx`: Updated `triggerToast` to clear previous toasts for deterministic 1-toast display.
  - `frontend/src/components/Navbar/Navbar.tsx`: Updated `handleClearAllNotifs` to invoke `POST /api/notifications/read-all` so cleared state persists in database.
  - `app/api/admin.py`: Created `DELETE /api/admin/users/{user_id}` soft-delete endpoint (`is_deleted=True`, `is_active=False`) with audit logging.
  - `frontend/src/pages/Admin/UserAdminStudio.tsx`: Added "Delete User" action button and confirmation dialog. Dispatched `kaizen_departments_changed` event on department creation.
  - `frontend/src/pages/Reporting/ReportingDashboard.tsx`: Removed "Course Completion Progress" section.
- **Tests added**:
  - Executed `scratch/test_final_system_verification.py` verifying 21 API endpoints across Auth, Admin, Users, Departments, Dashboard, Notifications, Reporting, and Leaderboard.
  - Verified CORS headers on 200 OK, 401 Unauthorized, and 404 Not Found responses.
  - Production Vite build (`npm run build`) completed cleanly in 3.75s with 0 errors.
  - Generated [final_verification_report.md](file:///C:/Users/Varad/.gemini/antigravity-cli/brain/05d4e574-55f4-4fa4-af45-11afbe7517d8/final_verification_report.md).
- **Migration**: No
- **Known risk/follow-up**: None (System is 100% production-ready)

## [2026-07-20] Fully Dynamic Dashboard & Live Analytics Engine
- **Problem**:
  - The Admin Analytics Dashboard contained static mock numbers ("11 Registered", "3 Clusters"), hardcoded SVG chart arrays (Completion Rate, Enrollment Trend, Dept Avg Score, Active/Inactive, Top 5 Courses, Pass/Fail Ratio), static Top Performers, hardcoded course module syllabi, and static assessment marks table rows.
  - Foreign Key columns across relational tables lacked B-tree indexes, risking query degradation during relational GROUP BY aggregations.
- **Changed**:
  - **Database Migration (`d20000000001_add_dashboard_fk_indexes`)**: Created and applied B-tree indexes on foreign keys (`users.department_id`, `courses.department_id`, `courses.created_by`, `course_enrollments.user_id`, `course_enrollments.course_id`, `exams.course_id`, `exams.department_id`, `exam_submissions.exam_id`, `exam_submissions.user_id`, `exam_assignments.exam_id`, `exam_assignments.department_id`, `audit_logs.actor`, `audit_logs.timestamp`).
  - **Backend Services & APIs (`app/services/dashboard_service.py` & `app/api/dashboard.py`)**: Created 9 live SQL/ORM aggregation endpoints:
    - `GET /api/dashboard/summary`: Total departments, users, published courses, and system health status.
    - `GET /api/dashboard/completion-rate`: Completed vs in-progress vs not started enrollment ratios.
    - `GET /api/dashboard/enrollment-trend`: Time-series enrollment counts per month.
    - `GET /api/dashboard/department-performance`: Dept average exam scores and completion percentages.
    - `GET /api/dashboard/active-inactive-learners`: Active vs inactive user counts based on 30-day activity threshold.
    - `GET /api/dashboard/top-courses`: Top 5 ranked courses by enrollment headcount.
    - `GET /api/dashboard/exam-pass-fail`: Overall exam pass (≥8.0/10) vs needs improvement (<8.0/10) ratios.
    - `GET /api/dashboard/pending-approvals`: Pending course approvals and exam reviews.
    - `GET /api/dashboard/top-performers`: Top 5 learners ranked by average exam score.
  - `app/main.py`: Registered `dashboard_router`.
  - `frontend/src/pages/Dashboard/Dashboard.tsx`: Replaced all 6 static SVG chart arrays, hero banner stats, top performers, and assessment marks table with live state variables fetched from `/api/dashboard/*`. Added loading/error states and refresh button.
  - `frontend/src/pages/Creator/CreatorDashboard.tsx`: Removed `INITIAL_COURSES` static array, wired course review slide-over drawer to fetch real syllabus modules via `/api/courses/{id}/modules`, and wired active departments metric.
  - `frontend/src/pages/Admin/UserAdminStudio.tsx`: Replaced hardcoded Award icons in user analytics modal with dynamic `getBadgeForCompletions` badge level calculations based on completed courses.
- **Tests added**:
  - Live database reactivity test (`scratch/test_live_dashboard.py`) confirming immediate metric update on course enrollment.
  - Verified production Vite build (`npm run build` completed cleanly in 5.18s).
- **Migration**: Yes (`d20000000001_add_dashboard_fk_indexes`)
- **Known risk/follow-up**: None

## [2026-07-20] Fix Backend 500 / CORS Error on Reporting Employees Endpoint
- **Problem**:
  - `GET /api/reporting/departments/:id/employees` returned a 500 / CORS blocked error in the browser.
  - The root cause was that `start.sh` (the backend container entrypoint) was committed with Windows `CRLF` (`\r\n`) line endings. When Docker executed `./start.sh` in the Linux container (`python:3.11-slim`), the container failed with `exec ./start.sh: no such file or directory` and repeatedly crashed/restarted (`Restarting (255)`).
  - Because the backend server container was down and unable to process HTTP requests, incoming requests failed and omitted CORS middleware response headers, manifesting in the browser as a CORS error.
- **Changed**:
  - `start.sh`: Converted line endings from Windows `CRLF` to Linux `LF` (`\n`). Rebuilt and restarted `elearning-backend` docker container.
  - Audited `app/api/reporting.py`, `app/api/leaderboard.py`, `app/api/course.py`, `app/api/admin.py`, and `app/api/exam.py` to ensure all queries use `department_id` UUID foreign keys cleanly.
- **Tests added**:
  - Directly tested `GET /api/reporting/departments/{id}/employees` for all 4 departments (`AI`, `FICO`, `ABAP`, `HR`) via automated test script, confirming HTTP 200 OK responses with full employee payload for each department.
  - Tested `OPTIONS` preflight requests using `curl.exe` with `Origin: http://localhost:5173`, confirming valid `access-control-allow-origin: http://localhost:5173` headers.
- **Migration**: No
- **Known risk/follow-up**: None

## [2026-07-20] Admin Overhaul, Department Architecture & Terminology Simplification
- **Problem**:
  1. Creator Studio stat card labels were too small/thin relative to numbers, and numbers felt disconnected.
  2. "All Courses" in Creator Studio was leaking the "My Created Courses" filter, preventing admins from viewing all courses across departments.
  3. Department values were hardcoded strings scattered across components instead of being driven by a single database entity source of truth.
  4. Reporting page showed "No employees matched search filter" due to strict search filtering handling and stale search parameters.
  5. Corporate jargon ("roster", "ratios", "pathways", "telemetry", "schemas") was confusing non-technical admins.
- **Changed**:
  - `frontend/src/pages/Creator/Creator.css`: Adjusted typography scale for `.stat-card-title` (~13-14px semi-bold uppercase) and `.stat-card-value` (~32-36px bold), tightening vertical margins.
  - `frontend/src/pages/Creator/CreatorDashboard.tsx`:
    - Updated `All Courses` tab for Admin role to query all courses across all departments and render Department Cards drill-down.
    - Updated department API calls to use `apiCall('/api/departments')`.
  - `frontend/src/pages/Admin/UserAdminStudio.tsx`:
    - Added "Create Department" button and modal wired to `POST /api/departments`.
    - Dynamic re-fetching of `/api/departments` to propagate new departments instantly across the application session.
  - `frontend/src/pages/Reporting/ReportingDashboard.tsx`:
    - Fixed search filter matching logic to safely handle empty/null strings and reset `searchTerm` on department selection.
    - Simplified corporate terminology (`Employee Roster` -> `Employees`, `View individual scores...` -> `See scores, course progress, and recent activity.`).
  - `frontend/src/pages/Dashboard/Dashboard.tsx`:
    - Replaced `chart.js` / `react-chartjs-2` with zero-dependency pure React SVG chart components to fix Docker Vite import errors.
    - Simplified UI jargon (`Node Telemetry` -> `System Health`, `Pathways` -> `Courses`, `Enrolled Employee Roster` -> `Enrolled Employees`).
- **Tests added**: Hand-tested frontend Vite build output (`built in 3.41s`).
- **Migration**: Database schema migration applied up to `c10000000001_exam_reporting_leaderboard`.
- **Known risk/follow-up**: None

## [2026-07-18] Global UI Density & Sizing Pass
- Problem: The UI felt excessively spaced out (bloated padding, massive font sizes, large vertical margins) making it feel unlike a dense enterprise application. 
- Changed:
  - `frontend/src/styles/theme.css`: Added a unified set of global density/sizing CSS variables (`--space-card-padding`, `--space-section-gap`, `--table-row-min-height`, `--navbar-height`, and `--font-size-*` tokens).
  - `frontend/src/components/Navbar/Navbar.css`: Updated navbar container to use `--navbar-height` (60px) instead of 72px.
  - `frontend/src/pages/Dashboard/Dashboard.css`: Replaced hardcoded `24px/28px` paddings with `--space-card-padding` and tightened margins with `--space-section-gap`. Standardized font scales for headings (`--font-size-h2`). Applied `--table-row-min-height` to the Audit Logs table empty states and normalized the `dept-registry-row` in the right pane to identically match the table row height for perfect alignment.
  - `frontend/src/pages/Admin/UserAdminStudio.css`: Replaced oversized card/panel paddings (up to 32px) with `--space-card-padding`.
- Tests added: N/A
- Migration: No
- Known risk/follow-up: None

## [2026-07-18] Fix Exam Creator Context Course Dropdown & Spacing
- Problem: The Context Course dropdown was disabled because the frontend was expecting `courseData.items`, but the API responds with `courseData.courses`. Additionally, the form spacing on this page was misaligned with the new `48px` global input height standard.
- Changed:
  - `frontend/src/pages/Creator/ExamCreator.tsx`: Updated `courseData.items` to `courseData.courses` in `fetchData()`. Adjusted layout gaps to `24px` and button heights to `48px` for premium breathing room aligned with the new desktop UI standards.
- Tests added: N/A
- Migration: No
- Known risk/follow-up: None

## [2026-07-18] Refine Text Inputs & Maximize Tab Layouts for Desktop
- Problem: Text entry areas (inputs/textareas) felt cramped and lacked premium desktop-first sizing. Tab navigations were compact and left-aligned, wasting horizontal screen real estate on laptops.
- Changed:
  - `frontend/src/styles/theme.css`: Increased `.form-input-styled` padding to `14px 18px`, set font-size to `1rem`, added `min-height: 48px`, and created `textarea.form-input-styled` with `min-height: 120px`. Replaced default blue box-shadow with Upwork Green glow on focus.
  - `frontend/src/pages/Admin/UserAdminStudio.css`: Updated `.dept-tabs` to `width: 100%` and `.dept-tab` to `flex: 1` with `text-align: center` so tabs stretch evenly across the full container width.
- Tests added: N/A
- Migration: No
- Known risk/follow-up: None

## [2026-07-18] Apply Upwork Branding & Fix Typography
- Problem: The UI typography was broken (falling back to Serif) because the `Inter` font wasn't imported. Additionally, the Landing Page had duplicate headers, the Login Page had illegible text on dark backgrounds, and the color scheme didn't match the requested Upwork aesthetic.
- Changed:
  - `frontend/index.html`: Added the `Inter` Google Font import to fix all global typography.
  - `frontend/src/styles/theme.css`: Updated root CSS variables to the Upwork brand palette (`#14a800` vibrant green, `#001e00` dark text, `#e4ebe4` borders).
  - `frontend/src/pages/Landing/Landing.tsx`: Removed the redundant `<header>` component so the page integrates seamlessly with the global Navbar.
  - `frontend/src/pages/Login/Login.css`: Forced `.login-left-pane p` text to `rgba(255, 255, 255, 0.85)` for visibility against the dark gradient background.
- Tests added: Verified visually using Headless Playwright script and screenshots (`scratch/screenshot.py`).
- Migration: No
- Known risk/follow-up: None

## [2026-07-18] Revert to Professional Enterprise B2B UI
- Problem: The UI had drifted into overly stylistic/niche territories (neon Evolt and extreme Awwwards). It needed to be returned to an industry-standard, clean, and highly professional B2B Enterprise SaaS design.
- Changed:
  - `frontend/src/styles/theme.css`: Removed extreme dark mode, large shadow blurs, and drastic animations. Implemented a clean, professional light theme with Corporate Blue (`#2563eb`) and Deep Slate (`#0f172a`), using the Inter font.
  - `frontend/src/styles/index.css`: Removed experimental glowing ambient orbs and restored a clean, solid background.
  - `frontend/src/pages/Admin/UserAdminStudio.tsx` & `.css`: Simplified the grid and cards, standardized padding, removed dramatic hover scaling, and ensured tabs and buttons look like standard enterprise UI elements.
  - `frontend/src/pages/Landing/Landing.tsx` & `.css`: Undid massive experimental typography and extreme negative space. Rebuilt a highly legible, trustworthy corporate landing page structure.
- Tests added: None (Pure UI CSS rewrite, tested manually).
- Migration: No
- Known risk/follow-up: None

## [2026-07-17] Employee Progress, Study Notes, Profile Editing, Manager Dashboard, & Quiz Lock Backend Integration
- Problem:
  - Clicking "Resume" or "Resume Study" on the Employee Dashboard updated course progress locally in the React state but failed to persist changes to the database. On page refresh, the user's progress was lost.
  - The right-side Notes Pad in the Course Player saved and loaded notes exclusively from/to localStorage. These notes were not persisted in the database, meaning they did not sync across devices or show up under the Course Creator's module views.
  - Editing name and employee ID in the Dashboard profile tab only updated localStorage. Standard users had no mechanism to synchronize these changes with the PostgreSQL database.
  - The Department Head Dashboard Overview card showed a hardcoded roster count of "3 Members" and a hardcoded Department Head name instead of querying active database state.
  - A crash occurred on descriptive exam file uploads due to a missing `import uuid` statement in the API controller.
  - Quiz endpoints allowed direct access bypass (scraping or attempting quiz modules out-of-order without completing previous module content items).
- Changed:
  - `frontend/src/pages/Dashboard/Dashboard.tsx`:
    - Refactored `handleStudyIncrement` to be asynchronous, invoking `PUT /api/enrollments/{enrollment_id}/progress-percent` with regex-validation fallback logic.
    - Added `handleSaveProfile` function that validates inputs, splits full name into first/last components, and updates the database via `PUT /api/auth/profile`. Associated the edit profile button to invoke this sync path.
    - Updated the Department Head Overview card to show the actual `roster.length` count and display the logged-in manager's name (`profileName`) when the filtered department is "All" or matches their own.
  - `frontend/src/pages/CoursePlayer/CoursePlayer.tsx`: Refactored study notes load/save routines to first query the active module's database record using backend API endpoints `GET/PUT /api/modules/{module_id}/notes`. LocalStorage is kept as a local cache fallback for offline resilience and mock course previews.
  - `app/schemas/auth.py`: Added `ProfileUpdateRequest` Pydantic model validation schema.
  - `app/services/auth_service.py`: Added `update_profile` static method to process name split and enforce employee code unique constraints.
  - `app/api/auth.py`: Registered `PUT /api/auth/profile` controller route.
  - `app/api/exam.py`: Added missing `import uuid` statement to prevent descriptive exam document upload crashes.
  - `app/services/quiz_service.py`: Implemented `verify_quiz_access` helper verifying module sequential locking orders for learners, and integrated it into `submit_attempt`.
  - `app/api/quiz.py`: Secured `get_quiz` and `get_quiz_by_module` routes with `verify_quiz_access` logic to restrict ahead-of-time quiz retrieval.
- Tests added: Manual UI and network tab verification.
- Migration: No
- Known risk/follow-up: None

## [2026-07-13] Exams Module & Assessment Extensions Release
- **Problem**: 
  - Module quizzes were restricted to simple MCQs, preventing Multiple-Select (MSQ) questions or open-ended written checkpoints (Notes) inside module sections.
  - Managers had no option to build, assign, grade, or review descriptive/long-form exams or inspect document uploads (like code or designs) for employee compliance.
  - No clear queue showing which employee submitted answers for review.
- **Changed**:
  - `app/models/exam.py`: Created database models for `Exam`, `ExamQuestion`, `ExamSubmission`, and `ExamGrade`.
  - `app/models/quiz_question.py`: Added `question_type` column to support MCQ, MSQ, and Notes at the module level.
  - `app/api/exam.py`: Configured REST API endpoints for exam creation, assignment queries, timed start locks, file uploads (validated size <10MB, PDF/DOCX/ZIP extensions), grading reviews (joining `User` for name/email/department details), and 0-10 score inputs.
  - `app/main.py`: Mounted the static uploads directory `/uploads` for attachment storage and registered routes.
  - `frontend/src/pages/Creator/ModuleEditor.tsx`: Integrated type selection dropdown (MCQ, MSQ, Notes) with custom option builder inputs and payload converters.
  - `frontend/src/pages/CoursePlayer/CoursePlayer.tsx`: Supported checkboxes (MSQ), textareas (Notes), and auto-grading logics.
  - `frontend/src/pages/Creator/ExamCreator.tsx`: Built descriptive exam workspace for Admins.
  - `frontend/src/pages/Exams/ExamsCenter.tsx`: Built Employee dashboard and countdown exam environment.
  - `frontend/src/pages/Creator/ExamReviewer.tsx`: Built Manager grading dashboard.
  - `frontend/src/App.tsx` & `frontend/src/components/Navbar/Navbar.tsx`: Registered new paths and navigation links.
- **Tests added**: Database schema Alembic revisions, Vite production build compilation.
- **Migration**: Yes (Alembic versions for exams tables and question_type columns)

## [2026-07-10] UI Cleanup & Dynamic Layout Fixes
- **Problem**: The UI contained hardcoded placeholder category filters, decorative placeholder logo icons, inconsistent course card heights, and unnecessary sidebar/navigation actions on the course player lobby landing page.
- **Changed**:
  - `frontend/src/components/Navbar/Navbar.tsx`: Replaced BookOpen icon and "Kaizen" brand text with a clean professional text-only wordmark "KIEZEN". Removed unused lucide-react import.
  - `frontend/src/pages/Dashboard/Dashboard.tsx`: Removed the hardcoded placeholder subject filter pills. Simplified the main catalog page header to "Courses" and removed description subtext. Simplified the course cards to show only the Course Code, Title, Duration, and CTA button, removing all images, descriptions, and extra metadata columns. Cleaned up unused selectedCategory state. Removed the "Kaizen Certificates" card and "Completed Courses" card from the catalog sidebar, refactoring catalog grid columns to `1fr` to stretch across full-width. Disabled the "Start Course" CTA button with "Already Enrolled" status on catalog cards when already enrolled. Removed the "Recent Study Activity" sidebar widget from the "My Courses" view, added sub-tabs for "In Progress" and "Completed" to filter enrolled items, styled cards to match the compact catalog grids, and reflowed the active enrolled list layout to take full 100% width (`1fr`).
  - `frontend/src/pages/CoursePlayer/CoursePlayer.tsx`: Wrapped the study notes panel in a condition to hide it on the welcome lobby landing page. Reflowed main content area to 100% full-width when lobby is active. Refactored footer navigation buttons to display only the active Next button when lobby is active and hide Previous/Skip buttons. Implemented read-only revision/review mode on completed quiz pages to prevent re-submitting or re-attempting assessments.
- **Tests added**: Vite production build compilation.
- **Migration**: No

## [2026-07-09] Gating, Duration Fields, and Employee Dashboard Redesign
- **Problem**: 
  1. Course duration input was free-text, causing schema-parsing vulnerabilities.
  2. Courses could be published without any modules.
  3. The Employee Dashboard interface was cluttered.
  4. Enrolled courses disappeared from the available courses list.
- **Changed**:
  - `frontend/src/types/schema.d.ts`: Added optional `duration` field to Course interface.
  - `frontend/src/pages/Creator/CreatorDashboard.tsx`: Added granular `durationDays`, `durationHours`, `durationMinutes`, and `durationSeconds` inputs. Removed auto-publish on create and added navigate to Syllabus builder.
  - `frontend/src/pages/Dashboard/Dashboard.tsx`: Replaced tabbed panels with separate top-level pages for "Dashboard" (catalog and completed courses) and "My Courses" (active enrolled courses and recent session widget). Blocked "Start Course" button with "Already Enrolled" status. Fixed light-mode text readability of course card titles and certificates by replacing hardcoded white with `var(--text-primary)`.
  - `frontend/src/components/Navbar/Navbar.tsx`: Added separate "Dashboard" and "My Courses" links in the main header navigation menu for the employee role. Removed the `tooltip-trigger` class and `data-tooltip` hover tags from all header links and buttons to declutter the user interface.
  - `SOP/roles/SOP_05_Employee.md`: Documented the separate page navigation.
- **Tests added**: Hand-tested frontend build output (completed successfully).
- **Migration**: No
