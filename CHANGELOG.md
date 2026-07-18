# Changelog

All notable changes to the Kaizen LMS project will be documented in this file.

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
