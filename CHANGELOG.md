# Changelog

All notable changes to the Kaizen LMS project will be documented in this file.

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
