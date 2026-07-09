# Changelog

All notable changes to the Kaizen LMS project will be documented in this file.

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
