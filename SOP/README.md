# 📚 E-Learning Platform — Standard Operating Procedures (SOP)

**Project**: Kiezen In-House E-Learning Management System (ELMS)
**Version**: 1.0
**Last Updated**: 09-Jul-2026
**Maintained By**: Varad Kadam, Samiksha

---

## 📋 SOP Index

This folder contains all Standard Operating Procedures for the E-Learning platform. Each SOP is organized by role and functional area.

---

## 📁 Folder Structure

```
SOP/
├── README.md                               ← You are here (Index & Navigation)
│
├── roles/
│   ├── SOP_01_System_Admin.md              ← System Admin full access guide
│   ├── SOP_02_Course_Admin.md              ← Course Manager guide
│   ├── SOP_03_Employee_Admin.md            ← HR Admin guide
│   ├── SOP_04_Manager.md                   ← Department Head / Manager guide
│   └── SOP_05_Employee.md                  ← Learner / Employee guide
│
├── pages/
│   ├── SOP_PAGE_01_Landing.md              ← Landing page access & behavior
│   ├── SOP_PAGE_02_Login.md                ← Login, OTP, password reset flow
│   ├── SOP_PAGE_03_Dashboard.md            ← Dashboard views per role
│   ├── SOP_PAGE_04_CoursePlayer.md         ← Course player & module navigation
│   ├── SOP_PAGE_05_CourseCreator.md        ← Course creation workflow
│   ├── SOP_PAGE_06_ViewCourses.md          ← Course catalog & enrollment
│   └── SOP_PAGE_07_AdminStudio.md          ← User & role management studio
│
├── features/
│   ├── SOP_FEAT_01_UserRoles.md            ← Role assignment & permissions matrix
│   ├── SOP_FEAT_02_CourseManagement.md     ← Course lifecycle management
│   ├── SOP_FEAT_03_EnrollmentFlow.md       ← Enrollment & assignment flows
│   ├── SOP_FEAT_04_TimedAccess.md          ← Timed course access & deadline locking
│   ├── SOP_FEAT_05_QuizAssessment.md       ← Quiz creation & assessment system
│   ├── SOP_FEAT_06_Feedback.md             ← N:1 feedback system
│   ├── SOP_FEAT_07_EmailNotifications.md   ← Automated email notifications
│   ├── SOP_FEAT_08_Analytics.md            ← Analytics dashboard & reporting
│   └── SOP_FEAT_09_Security.md             ← Security, JWT, session management
│
└── api/
    └── SOP_API_Reference.md                ← Complete API endpoint reference by role
```

---

## 🎯 Who Should Read What

| Role | Primary SOPs | Secondary SOPs |
|------|-------------|----------------|
| **System Admin** | SOP_01, SOP_FEAT_01, SOP_FEAT_09 | All others |
| **Course Admin (Course Manager)** | SOP_02, SOP_FEAT_02, SOP_FEAT_03, SOP_FEAT_05 | SOP_PAGE_05, SOP_PAGE_06 |
| **Employee Admin (HR Admin)** | SOP_03, SOP_FEAT_01, SOP_FEAT_03 | SOP_PAGE_07 |
| **Manager / Dept. Head** | SOP_04, SOP_FEAT_06, SOP_FEAT_08 | SOP_PAGE_03 |
| **Employee / Learner** | SOP_05, SOP_FEAT_04 | SOP_PAGE_04, SOP_PAGE_06 |
| **Developer** | SOP_FEAT_09, SOP_API_Reference | All feature SOPs |

---

## 🔑 Role Names in System

| Display Name | Internal Code | Description |
|---|---|---|
| System Admin | `SYSTEM_ADMIN` | Full platform access & control |
| Course Admin | `COURSE_MANAGER` | Manages courses, modules, quizzes |
| Employee Admin | `HR_ADMIN` | Manages users, departments, roles |
| Manager / Head | `MANAGER` | Department-level oversight & reports |
| Employee | `EMPLOYEE` | Takes courses, submits quizzes, feedback |

---

## 🔄 SOP Maintenance Guidelines

1. **Update SOPs** every time a new feature is developed or an existing one changes.
2. **Version-control** by updating the `Last Updated` field and incrementing the version in each SOP.
3. All SOP files are in **Markdown (.md)** format for GitHub compatibility.
4. SOPs should be reviewed during every sprint before the weekly WSR is submitted.
5. Link SOPs in the project's `docs/` folder for developer reference.
