# E-Learning LMS - Project Progress Report

This document traces the progress of the E-learning LMS backend development from the beginning of the project.

---

## Progress Summary

| Phase | Description | Status | Target/Migration ID |
| :--- | :--- | :---: | :--- |
| **Phase 0** | Authentication Module & Initial Scaffold | **Completed** | `cd4ec1a6712e` |
| **Phase 1** | Core Domain Models & Migrations | **Completed** | `068da708842c` |
| **Phase 2** | Pydantic Schemas & Validation | **Completed** | Phase 2 Schemas |
| **Phase 3** | Service Layer Implementation | **Completed** | Phase 3 Services |
| **Phase 4** | API Routes Layer | **Completed** | Phase 4 Routes |
| **Phase 5** | Module & Content Management | **Completed** | Phase 5 Modules |

---

## Phase Details

### Phase 0: Authentication Module

#### Objective
Design and implement the authentication module including JWT-based login, access and refresh token rotation, password change/reset flow, and Role-Based Access Control (RBAC).

#### Files Created
- `app/api/auth.py` — Authentication routes (login, logout, refresh, reset password, etc.)
- `app/services/auth_service.py` — Core authentication service logic
- `app/services/email_service.py` — Local or SMTP-based mock email dispatch for password reset OTPs
- `app/services/otp_service.py` — Code generation, validation, and expiry management for OTPs
- `app/services/token_service.py` — JWT signing, verification, and rotation logic
- `app/schemas/auth.py` — Pydantic schemas for auth requests and responses
- `app/schemas/user.py` — Basic role and user response schemas
- `app/models/user.py` — User SQLAlchemy database model
- `app/models/role.py` — Role SQLAlchemy database model (ADMIN, MANAGER, EMPLOYEE)
- `app/models/user_role.py` — Many-to-many relationship mapping user to roles
- `app/models/otp.py` — Password reset OTP token model
- `app/models/refresh_token.py` — Active JWT refresh token model
- `alembic/versions/cd4ec1a6712e_create_authentication_schema.py` — Alembic database migration file

#### Files Modified
- `app/main.py` — Hooked authentication router into the main FastAPI application

#### Database Changes
- **Migration ID**: `cd4ec1a6712e`
- **Created Tables**:
  - `roles` (id: `UUID`, name: `String`, created_at: `DateTime`)
  - `users` (id: `UUID`, employee_code: `String`, first_name: `String`, last_name: `String`, email: `String`, password_hash: `String`, department_id: `UUID`, is_active: `Boolean`, is_deleted: `Boolean`, must_change_password: `Boolean`, created_at: `DateTime`, updated_at: `DateTime`)
  - `password_reset_otps` (id: `UUID`, user_id: `UUID`, otp_code: `String(6)`, expires_at: `DateTime`, is_used: `Boolean`, created_at: `DateTime`)
  - `refresh_tokens` (id: `UUID`, user_id: `UUID`, token: `String`, expires_at: `DateTime`, is_revoked: `Boolean`, created_at: `DateTime`)
  - `user_roles` (id: `UUID`, user_id: `UUID`, role_id: `UUID`, created_at: `DateTime`)
- **Seeded Data**:
  - Default Roles: `ADMIN`, `MANAGER`, `EMPLOYEE`
  - Default Users: `john.doe@lms.com` (EMPLOYEE), `admin@lms.com` (ADMIN)

#### Status
**Completed**

---

### Phase 1: Core Domain Models & Migrations

#### Objective
Implement core domain models representing the main entities of the LMS, such as Courses, Departments, Modules, Module Contents, Enrollments, Progress Tracking, Quizzes, and Course Approvals. Set up relationships and database migrations.

#### Files Created
- `app/models/department.py` — Department model
- `app/models/course.py` — Course model
- `app/models/course_module.py` — CourseModule model
- `app/models/module_content.py` — ModuleContent model (for videos, documents, quizzes, articles)
- `app/models/course_enrollment.py` — CourseEnrollment model
- `app/models/user_course_progress.py` — Progress tracking model
- `app/models/quiz.py` — Quiz model
- `app/models/quiz_question.py` — QuizQuestion model
- `app/models/quiz_attempt.py` — QuizAttempt model
- `app/models/course_approval.py` — CourseApproval submission and history tracking model
- `alembic/versions/068da708842c_phase1_course_management.py` — Alembic database migration file

#### Files Modified
- `app/models/__init__.py` — Registered and exported all SQLAlchemy models to make them discoverable by Alembic

#### Database Changes
- **Migration ID**: `068da708842c`
- **Created Tables**:
  - `departments` (id: `UUID`, name: `String`, code: `String` [unique index], description: `String`, created_at: `DateTime`)
  - `courses` (id: `UUID`, course_code: `String` [unique index], title: `String`, description: `String`, difficulty_level: `String`, is_published: `Boolean`, created_by: `UUID` [FK -> users.id], department_id: `UUID` [FK -> departments.id], status: `String`, created_at: `DateTime`, updated_at: `DateTime`)
  - `course_approvals` (id: `UUID`, course_id: `UUID` [FK -> courses.id], submitted_by: `UUID` [FK -> users.id], reviewed_by: `UUID` [FK -> users.id], status: `String`, rejection_reason: `String`, submitted_at: `DateTime`, reviewed_at: `DateTime`)
  - `course_enrollments` (id: `UUID`, user_id: `UUID` [FK -> users.id], course_id: `UUID` [FK -> courses.id], status: `String`, enrolled_at: `DateTime`, completed_at: `DateTime`)
  - `course_modules` (id: `UUID`, course_id: `UUID` [FK -> courses.id], title: `String`, description: `String`, sequence_no: `Integer`, created_at: `DateTime`)
  - `module_contents` (id: `UUID`, module_id: `UUID` [FK -> course_modules.id], title: `String`, content_type: `String`, file_path: `String`, duration_seconds: `Integer`, sequence_no: `Integer`, is_active: `Boolean`)
  - `quizzes` (id: `UUID`, module_id: `UUID` [FK -> course_modules.id], title: `String`, passing_score: `Integer`, time_limit_minutes: `Integer`, is_published: `Boolean`)
  - `quiz_attempts` (id: `UUID`, user_id: `UUID` [FK -> users.id], quiz_id: `UUID` [FK -> quizzes.id], score: `Float`, passed: `Boolean`, started_at: `DateTime`, completed_at: `DateTime`, answers: `JSON`)
  - `quiz_questions` (id: `UUID`, quiz_id: `UUID` [FK -> quizzes.id], question_text: `String`, options: `JSON`, correct_answer: `String`, explanation: `String`, points: `Integer`)
  - `user_course_progress` (id: `UUID`, enrollment_id: `UUID` [FK -> course_enrollments.id], module_id: `UUID` [FK -> course_modules.id], content_id: `UUID` [FK -> module_contents.id], completed: `Boolean`, completed_at: `DateTime`, time_spent_seconds: `Integer`)
- **Altered Tables**:
  - Linked `users.department_id` to `departments.id` via foreign key reference with `SET NULL` on delete.

#### Status
**Completed**

---

### Phase 2: Pydantic Schemas

#### Objective
Standardize data validation, request parsing, and response serialization by creating Pydantic schemas corresponding to all core models from Phase 1. Enforce validation rules and type hints while maintaining full compatibility with SQLAlchemy ORM structures.

#### Files Created
- `app/schemas/course.py` — Schema definitions for Course (`CourseCreate`, `CourseUpdate`, `CourseResponse`, `CourseListResponse`), CourseModule (`CourseModuleCreate`, `CourseModuleResponse`), ModuleContent (`ModuleContentCreate`, `ModuleContentResponse`), and the `CourseStatus` enum.
- `app/schemas/enrollment.py` — Schema definitions for CourseEnrollment (`EnrollmentCreate`, `EnrollmentResponse`, `EnrollmentStatus` enum), and UserCourseProgress (`ProgressUpdate`, `UserProgressResponse`).
- `app/schemas/quiz.py` — Schema definitions for Quiz (`QuizCreate`, `QuizResponse`), QuizQuestion (`QuizQuestionCreate`, `QuizQuestionResponse`), QuizAttempt (`QuizAttemptCreate`, `QuizAttemptResponse`), and a structured `QuizResult` breakdown.
- `app/schemas/department.py` — Schema definitions for Department (`DepartmentCreate`, `DepartmentUpdate`, `DepartmentResponse`).
- `app/schemas/admin.py` — Administrative schema definitions for user creation (`UserCreate`), modifications (`UserUpdate`), listing (`UserListResponse`), and assigning roles (`RoleAssignmentRequest`).
- `app/schemas/__init__.py` — Exposes all schemas inside the `app/schemas` module for clean import structures.

#### Files Modified
- None (The existing files `auth.py` and `user.py` inside `app/schemas/` were kept unmodified to preserve backward compatibility).

#### Database Changes
- None

#### Status
**Completed**

---

### Phase 3: Service Layer Implementation

#### Objective
Implement the business logic layer of the application by creating service classes corresponding to each subdomain module. Handle transactional boundaries, validation logic, and proper HTTP error exceptions using FastAPI dependencies and SQLAlchemy Session models.

#### Files Created
- `app/services/course_service.py` — Handles course creation, update, retrieval, listing, publication status transitions, approval flow, and reviewer actions.
- `app/services/enrollment_service.py` — Manages course enrollment flow, course progress logs (module content updates), auto-completion checks, and forced completion.
- `app/services/quiz_service.py` — Handles quiz instantiation, question authoring, user attempts validation, and score calculation rules.
- `app/services/department_service.py` — Manages department registration, configuration edits, and retrieval.
- `app/services/admin_service.py` — Handles user creation (with secure password hashing), modifications, role assignment overrides, and user listing.

#### Files Modified
- None

#### Database Changes
- None

#### Status
**Completed**

---

### Phase 4: API Routes Layer

#### Objective
Design and implement the HTTP endpoint routing layer of the E-learning LMS using FastAPI. Hook up the core business logic from services and standard schemas to ensure structured requests and JSON serialization. Enforce role-based access control (RBAC) via FastAPI dependency injection.

#### Files Created
- `app/api/course.py` — Course-related endpoints, approval states, publishing, and pagination list features.
- `app/api/enrollment.py` — Enrollment paths, my-courses user summaries, and active progress logging.
- `app/api/quiz.py` — Quiz setup, question mapping, user attempt submissions, and grading records retrieval.
- `app/api/department.py` — Department details, lists, edits, and deletions.
- `app/api/admin.py` — User management endpoints (creation, modifications, user query, role updates).

#### Files Modified
- `app/main.py` — Registered and integrated the five new API routers into the FastAPI application.
- `app/services/course_service.py` — Added integration method `delete_course`.
- `app/services/enrollment_service.py` — Added integration method `get_enrollment`.
- `app/services/quiz_service.py` — Added integration method `get_quiz`.
- `app/services/department_service.py` — Added integration method `delete_department`.

#### Endpoint Summary
- **Courses**:
  - `GET /api/courses` — List courses with status filter and pagination (Authenticated Users)
  - `GET /api/courses/{course_id}` — Get course details (Authenticated Users)
  - `POST /api/courses` — Create a new course (Admins & Managers)
  - `PUT /api/courses/{course_id}` — Edit course details (Admins & Managers)
  - `DELETE /api/courses/{course_id}` — Remove a course (Admins & Managers)
  - `POST /api/courses/{course_id}/publish` — Mark approved course as published (Admins & Managers)
  - `POST /api/courses/{course_id}/submit-for-approval` — Submit draft course for approval review (Authenticated Users)
  - `POST /api/courses/{course_id}/approve` — Approve pending course submission (Admins Only)
  - `POST /api/courses/{course_id}/reject` — Reject pending course submission (Admins Only)
- **Enrollments**:
  - `POST /api/enrollments` — Enroll current user in a course, or enroll another user (Admins & Managers can enroll others)
  - `GET /api/enrollments/my-courses` — Retrieve enrolled courses of current user (Enrolled User)
  - `GET /api/enrollments/{enrollment_id}` — Get course enrollment progress metrics (Enrolled User, Admins, or Managers)
  - `PUT /api/enrollments/{enrollment_id}/progress` — Update learning content unit progress (Enrolled User Only)
  - `POST /api/enrollments/{enrollment_id}/complete` — Complete course enrollment explicitly (Enrolled User, Admins, or Managers)
- **Quizzes**:
  - `POST /api/quizzes` — Create new quiz (Admins & Managers)
  - `GET /api/quizzes/{quiz_id}` — Retrieve quiz details (Authenticated Users)
  - `POST /api/quizzes/{quiz_id}/questions` — Add a question to an existing quiz (Admins & Managers)
  - `POST /api/quizzes/{quiz_id}/attempt` — Record user answers and grade attempt (Enrolled User)
  - `GET /api/quizzes/{quiz_id}/results` — Fetch detailed attempt evaluation (Enrolled User)
- **Departments**:
  - `GET /api/departments` — List departments (Authenticated Users)
  - `GET /api/departments/{department_id}` — Get department details (Authenticated Users)
  - `POST /api/departments` — Create new department (Admins Only)
  - `PUT /api/departments/{department_id}` — Update department details (Admins Only)
  - `DELETE /api/departments/{department_id}` — Remove a department (Admins Only)
- **Admin**:
  - `POST /api/admin/users` — Create user (Admins Only)
  - `PUT /api/admin/users/{user_id}` — Update user fields and status (Admins Only)
  - `GET /api/admin/users` — List users (Admins Only)
  - `POST /api/admin/users/{user_id}/roles` — Assign user role overrides (Admins Only)

#### Authorization Rules
- **General Access**: All endpoints require a valid access token in the `Authorization` header (`Bearer <JWT>`).
- **Role Limits**: Role checks are enforced on endpoints using the `RequireRoles(...)` dependency:
  - `ADMIN` role is required for user creation, updating, role changes, department mutations, and course approval reviews.
  - `ADMIN` or `MANAGER` roles are required for course mutations, publication, and quiz questions creation.
- **Resource Ownership**: Users can view only their own records (enrollments, quiz attempts, progress updates) unless they hold elevated (`ADMIN`/`MANAGER`) credentials.

#### Status
**Completed**

---

### Phase 5 - Module & Content Management

#### Objective
Implement the complete module management and content layer of the LMS application. Expose endpoints and services to administer modules and learning contents within courses, validating nested resource hierarchies, checking progress update bounds, and aligning API interfaces for frontend screen components.

#### Files Created
- `app/api/module.py` — Exposes REST routes for course modules and learning contents.
- `app/services/module_service.py` — Core logic representing module CRUD operations, sequential listings, and content updates.

#### Files Modified
- `app/main.py` — Registered and integrated the new `module_router` into the FastAPI instance.
- `app/schemas/course.py` — Appended schemas `ModuleCreate`, `ModuleUpdate`, `ModuleResponse`, `ModuleListResponse`, and `ModuleContentUpdate`.
- `app/schemas/__init__.py` — Exposed the new module/content schemas.
- `app/services/enrollment_service.py` — Refactored progress validation rules to strictly check module existence, content boundaries, and course matching in `update_progress`.

#### Database Changes
- None (The schema is fully compatible with existing SQLAlchemy database tables `course_modules` and `module_contents`).

#### API Endpoints
- `POST /api/modules` — Create a new course module (Admins & Managers)
- `GET /api/modules` — List all modules globally (Authenticated Users)
- `GET /api/modules/{module_id}` — Retrieve details of a module by ID (Authenticated Users)
- `PUT /api/modules/{module_id}` — Update a module sequence/details (Admins & Managers)
- `DELETE /api/modules/{module_id}` — Delete a module and nested contents (Admins & Managers)
- `GET /api/courses/{course_id}/modules` — Retrieve all modules for a course in sequence (Authenticated Users)
- `POST /api/modules/{module_id}/contents` — Create a learning content item in a module (Admins & Managers)
- `GET /api/modules/{module_id}/contents` — List contents within a module sequentially (Authenticated Users)
- `GET /api/contents/{content_id}` — Retrieve a content item detail (Authenticated Users)
- `PUT /api/contents/{content_id}` — Edit learning content details (Admins & Managers)
- `DELETE /api/contents/{content_id}` — Remove content unit from a module (Admins & Managers)

#### Frontend Integration Notes
- Direct sequence mapping: Sequence fields (`sequence_no`) are returned directly in lists to enable seamless ordering on frontend screens.
- Auto-progress linkage: Creating or completing content units immediately triggers recalculation of course completion status on progress tracking screens.
- Embedded structure: `ModuleResponse` embeds nested `contents: List[ModuleContentResponse]` to prevent redundant API fetches on Module Detail and Viewer screens.

#### Status
**Completed**

---

## Change Log

Below is the change history showing git branches and commit IDs:

| Commit ID | Branch | Message | Description |
| :--- | :--- | :--- | :--- |
| *Active Work* | `phase-2-schemas` | (Work Completed) | Implemented Phase 5 Module & Content management service, schemas, and routes, and updated enrollment progress validation. |
| *Active Work* | `phase-2-schemas` | (Work Completed) | Implemented all Phase 4 API routing endpoints, registered them under `app/main.py`, and verified the integration layer. |
| *Active Work* | `phase-2-schemas` | (Work Completed) | Implemented all Phase 3 Service Layer modules (`course_service`, `enrollment_service`, `quiz_service`, `department_service`, and `admin_service`). |
| *Active Work* | `phase-2-schemas` | (Work Completed) | Implemented all Phase 2 Pydantic schemas and registered them under `app/schemas/__init__.py`. |
| `79c8331` | `main` | Phase 1: course management models and migrations | Created core database models for E-learning system and registered migrations using Alembic. |
| `09ecc1e` | `main` | Implemented login authentication module | Designed user authentication model, Otps, refresh tokens, services, and endpoints. |
| `66bdee7` | `main` | Merge pull request #1 from Varad-6/samikshajagtapp-patch-1 | Merged patch branch. |
| `694eb75` | `main` | Add hello world to demo.txt | Added baseline text file. |
| `92ae9be` | `main` | Initial commit | Initial boilerplate project scaffold. |
