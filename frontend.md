# 🎓 E-Learning Platform Frontend Development Tracker

This file serves as our living documentation and changelog. As we implement parts of the frontend, we will update the progress here.

## 🚀 Project Overview
- **Technology Stack**: React, TypeScript, Vite, Vanilla CSS, Lucide Icons, React Router DOM
- **Design Inspiration**:
  - **Udemy**: Structured layout, clear course categorization, filter options, learning flow.
  - **Puma**: High-contrast, premium dark mode, bold typography, smooth micro-animations.
- **Theme**: Light & Dark mode support toggled globally via context.

---

## 📅 Roadmap & Status

### Phase 1: Setup & Groundwork
- [x] Create separate `frontend/` folder
- [x] Initialize Vite React + TypeScript project
- [x] Install dependencies (`lucide-react`, `react-router-dom`)
- [x] Implement global styling variables (`theme.css`)
- [x] Create `ThemeContext` for global Light/Dark mode toggling

### Phase 2: Design System & Core Reusable Components
- [x] `Button` (Sleek hover scales, glowing shadows)
- [x] `Input` (Floating label transitions, error states)
- [x] `Card` (Udemy course layout with Puma styling)
- [x] `Navbar` & `Footer` (with custom inline SVG social icons)

### Phase 3: Page Layouts
- [x] **Landing Page**:
  - Hero banner with corporate e-learning metrics
  - Category filters and dynamic course cards
  - High-impact value proposition
  - **Interactive Demo Gateways** (Learner Login, Creator Login, Admin Login)
- [x] **Login Page**:
  - 50/50 split-screen premium layout
  - Validation styling matching enterprise roles (Employee, Manager, Admin)
  - Seamless redirection
- [x] **Dashboard Workspace Page**:
  - Role-based panel views (Employee progress tracker, Manager team status logs, Administrator audit traces)
  - Interactive simulator action to increment module progress percent in real time.

### Phase 4: Playwright E2E Testing & Desktop Optimization
- [x] Install Playwright E2E testing framework and browser binaries
- [x] Create configuration file (`playwright.config.ts`) mapping auto-managed Vite server scripts
- [x] Implement comprehensive E2E tests:
  - `auth.spec.ts`: Landing portals routing, Custom credential validation errors, Role authentication persistence, and Session logouts.
  - `dashboard.spec.ts`: Employee study progress, Creator assignments rosters, and Admin dashboard metrics.
- [x] Append custom `package.json` scripts supporting headless, headed, and visual UI modes.
- [x] Audit and enhance computer/laptop styling parameters (responsive container widths, smooth hover states, hover-translation transitions, etc.).


### Phase 5: Rebranding & Advanced Dashboard Workspaces
- [x] Rebrand platform to **Knowva: A Learning Hub**
- [x] Add Forgot Password flow with mock email OTP verification in Login panel
- [x] Redesign Employee Dashboard:
  - [x] Add course modules slide-in / modal view.
  - [x] Add "Recent Course" progress bar & resume button in sidebar.
  - [x] Add "My Profile" metadata details sidebar (manager, employee code, etc.).
- [x] Redesign Manager Dashboard:
  - [x] Add IDE-style side navigation drawer panel toggles (Create Course, My Courses, Audit & Reporting).
  - [x] Create interactive sub-views (edit courses, view employee test grades/scores).
  - [x] Add Department statistics grid & filter menus.
  - [x] Remove assignment panel form.

### Phase 6: Rebranding to Kiezen, Profile Pages, and Tooltip Animations
- [x] Rename platform to **Kiezen** (Continuous Improvement) and update quote
- [x] Remove "Live Platform Monitor" indicators
- [x] Implement full-page Profile tab view in Dashboard (routing query parameter `?tab=profile`)
- [x] Build marks report list, ongoing progress course trackers, and certificates grids under Profile view
- [x] Integrate hover tooltips (`data-tooltip`) and option pop-up micro-animations
- [x] Remove "Kiezen Platform Overview" preview widget completely from Landing page and center the hero section layout
- [x] Remove the profile details card from the Employee Dashboard sidebar
- [x] Implement inline editable input fields for User Name and Employee ID inside the Profile Workspace, syncing updates to localStorage and the dashboard welcome greeting
- [x] Apply professional CSS Grid rules and spacing parameters to align the Profile details side card and performance grids
- [x] Redesign the website footer into a minimalist horizontal Support gateway navigation row, removing columns and description widgets

### Phase 7: Advanced Course Creator & Native Drag-and-Drop Workspace
- [x] Integrate mandatory star tags (`*`) across all creation fields (Title, Code, Description, Priority, Duration) in Creator Dashboard.
- [x] Permanently display module syllabus quick-add builder for rapid sequential entries.
- [x] Implement native HTML5 Drag & Drop composer block reordering with cursor movement feedback.
- [x] Enforce visual typography spacing and bold H1/H2 rendering inside the live preview canvas.
- [x] Support direct YouTube, Blog, Web, PDF/PPT attachments, and image/video link composition.
- [x] Consolidate notebook editor notes and MCQ assessment builder tabs on the right utilities panel.

### Phase 8: Landing, Login Refactoring & Simplified Manager Auditing Dashboard
- [x] Remove the role select and department select fields from the sign-in form.
- [x] Integrate animated success transitions with background wiping and custom splash GIF rendering.
- [x] Direct Manager portal logins to land straight on Creator Studio (/creator/dashboard).
### Phase 9: Admin User Administration Studio
- [x] Upgraded backend schemas (`AdminUserResponse` and `UserListResponse`) to include full role and department details.
- [x] Created a dedicated, professional `UserAdminStudio` layout for Admin role in `/admin/users`.
- [x] Implemented searchable/filterable directory of registered corporate users with custom tags.
- [x] Built User creation form with temporary password generation tool and department list mapping.
- [x] Integrated active account toggle status (suspension) and soft deletion capabilities.
- [x] Wrote automated Playwright E2E verification test suite for Admin user lifecycle checks.

### Phase 10: Senior Course Player Overhaul & Locks
- [x] Built left-side curriculum drawer panel with slide animation toggle.
- [x] Enforced sequential locking progression to prevent skipping modules before completing previous assessments.
- [x] Added right-side persistent Notes Pad workspace with download notes text file capability and localStorage persistence.
- [x] Upgraded video slide player to support local video uploads and YouTube embedded parameters.
- [x] Integrated end-of-module interactive MCQ quiz with unlock flags.
- [x] Rendered global theme toggle inside player header for full Light/Dark mode transitions.

---


## 🛠️ Folder Structure
```
/Users/varad/documents/E-learning/frontend/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── Button/           # Reusable Button and styles
│   │   ├── Card/             # Reusable Course card and styles
│   │   ├── Input/            # Reusable Input and styles
│   │   ├── Navbar/           # Layout Header and styles
│   │   ├── Footer/           # Layout Footer and styles
│   │   └── ThemeToggle/      # Rotational Sun/Moon icon toggle
│   ├── context/
│   │   └── ThemeContext.tsx  # Dynamic root attribute toggler
│   ├── pages/
│   │   ├── Landing/          # Homepage with role entry portals
│   │   ├── Login/            # Split pane credentials panel
│   │   └── Dashboard/        # Custom workspaces for roles
│   ├── styles/
│   │   ├── theme.css         # CSS Light/Dark Variables
│   │   └── index.css         # Resets and global animation keyframes
│   ├── types/
│   │   └── schema.d.ts       # parities matching ERD diagram tables
│   ├── App.tsx               # Route mapper and context loaders
│   └── main.tsx
├── package.json
└── vite.config.ts
```

---

## 📝 Change Log

### [2026-06-20] - Init & Launch Phase
- Moved Vite React-TS boilerplate files into a dedicated `/frontend` folder.
- Installed `lucide-react` and `react-router-dom`.
- Set up `ThemeContext` tracking state and changing `[data-theme]` attribute on HTML root.
- Created reusable components: `Button`, `Input`, `Card`, `Navbar`, and `Footer`.
- Designed `Landing` page featuring brand statistics, catalog filters, and "Interactive Demo Portals" permitting one-click login for Employees, Managers, and Administrators.
- Designed `Login` page containing Split-screen panels, custom form fields, input error indicators, and role selection inputs.
- Designed role-based `Dashboard` skeleton displaying progress counters for Learners, report lists for Creators, and database audit logs for Admins.
- Ran successful production build (`tsc -b && vite build`) verifying TypeScript compiling health.
- Installed Playwright E2E testing framework, configuration structures, and Chromium browser bin.
- Wrote full-coverage E2E integration test suites for Authentication transitions (`auth.spec.ts`) and Role-based dashboards (`dashboard.spec.ts`).
- Configured custom test runners in `package.json` for headless execution, headed execution, and the Playwright interactive UI runner.
- Audited desktop styles to optimize scaling, spacing, hover transitions, and viewport constraints on computers/laptops.

### [2026-06-20] - Rebranding & Advanced Dashboard Workspaces
- Rebranded platform name globally to **Knowva: A Learning Hub**, including `index.html` metadata title, logo marks, and header components.
- Integrated multi-step Forgot Password credentials recovery panel, simulating dispatch of 6-digit email verification OTP with 30-second resend limit helper triggers.
- Restructured Employee Dashboard page layout:
  - Built an interactive modules timeline modal presenting step logs mapped dynamically using state variables.
  - Embedded "Recent Course Activity" sidebar resume shortcut allowing users to advance active module curriculums directly.
  - Updated profile statistics widget showing employee codes, email addresses, manager nodes, and status splits.
- Restructured Manager Dashboard layout matching an IDE sidebar pattern:
  - Added hamburger Menu toggle drawer launching options for Course Creation, Managed Course Syllabus, and Auditing & Reporting logs.
  - Designed draft resume/edit sub-tabs checking whether active workspace draft models are saved, transitioning cleanly to a fresh course assembly form.
  - Replaced team assignment forms with roster grid auditing logs letting managers inspect individual test performance percentages and marks overlays.
- Rewrote end-to-end Playwright tests to align with rebranded texts and modernized navigation drawer selections.

### [2026-06-22] - Advanced Course Creator & Native Drag-and-Drop Workspace
- Added mandatory star marks (`*`) for all course fields (Title, Code, Description, Priority, Duration) in Creator Dashboard creation form.
- Restructured Course Syllabus modules panel, making the quick module creation form permanently visible at the top of the modules canvas for seamless rapid entries.
- Refactored Module Editor block composer, replacing legacy list sorting buttons with native HTML5 Drag and Drop reordering controls accompanied by an interactive grab cursor and `GripVertical` indicator.
- Updated H1/H2 bold typography settings and accurate block margin spacing parameters inside the live preview canvas.
- Integrated image/video direct upload URL blocks, and verified compilation build health (`npm run build`).

### [2026-06-22] - Login Simplification, Splash Overlay, and Auditing Constraints
- Removed Access Role select list and Department inputs from the login screen, autodetecting credentials dynamically via response claims.
- Integrated a full-screen transition splash screen containing the custom loading GIF `/login_transition.gif` with adaptive dark/light background layouts.
- Re-routed Creator/Manager logins to direct the session straight into the Creator Studio page instead of the general dashboard.
- Restructured manager dashboard workspaces in `Dashboard.tsx` to omit course syllabus drafting panels, displaying solely the employee roster audit tables.

### [2026-06-23] - Course Approvals Workflow & Role Realignment
- Rebranded "Manager" role references to "Department Head" in dashboard welcome banners, profiles, registries, and portals.
- Extended "Creator Studio" route access to all logged-in roles (Employees, Department Heads, and Admins).
- Created a Course approvals tab in Creator Studio scoped contextually:
  - **Employees**: See own created courses status (`Draft`, `Pending`, `Approved`, `Rejected`), and can submit drafts for review.
  - **Department Heads**: Review, Approve, and Reject courses belonging to their department.
  - **Administrators**: Navigate a selector grid of all departments to approve/reject courses globally.
- Designed an interactive Slide-over Review Drawer to inspect course metadata and module syllabus items.
- Built a Rejection Feedback dialog prompting for notes, displaying active rejection notes directly on the owner's course cards for edit-resubmission flows.

- Removed bright blue underline active slide indicators from both the global Navbar and general Dashboard tabs, replacing them with subtle theme-accent capsule background highlights.
- Restored the 2.5-second full-screen loading splash overlay transition screen (`.login-transition-overlay`) in the credentials login process.
- Replaced `<Link>` tags in the global Navbar with custom styled `div` buttons executing programmatic `navigate()` calls. This completely eliminates the browser's native hover preview status bar at the bottom-left of the screen.

### [2026-06-29] - Senior Course Player Overhaul & Locks
- Overhauled [CoursePlayer.tsx](file:///C:/Users/Varad/Documents/GitHub/E-learning/frontend/src/pages/CoursePlayer/CoursePlayer.tsx) to integrate a left-side curriculum drawer panel with slide animation toggle.
- Enforced sequential module locking progression to prevent skipping modules before completing previous assessments.
- Integrated a right-side Study Notes pad widget with save and download text file features.
- Upgraded the media player to support YouTube video embed rendering alongside custom local file uploads.
- Built interactive module quiz questions with score verification and next module unlocks.
- Provided global theme toggling hooks support to support Light/Dark theme transitions inside the player.

