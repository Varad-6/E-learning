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
