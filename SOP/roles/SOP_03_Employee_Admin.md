# 👥 Standard Operating Procedure: Employee Admin Role

**Internal Code**: `HR_ADMIN`  
**Version**: 1.0  
**Effective Date**: 09-Jul-2026  
**Audience**: HR Managers, IT Helpdesk, Operations  
**Scope**: User Accounts, Departments, Onboarding & Offboarding  

---

## 1. Purpose & Scope
This SOP defines the processes for managing user directories, department setups, and employee metadata. Employee Admins (HR Admins) ensure the org chart is accurately reflected in the system database.

---

## 2. Page & API Scope
*   **Admin Studio**: Full access to the User list, User creation form, Department editor, and deactivation controls.
*   **View Courses**: Read-only access to browse courses.
*   **Dashboard**: Overview of department size, new joins, and training progress ratios.
*   **Restricted**: Cannot create, edit, or delete courses/quizzes.

---

## 3. Standard Procedures

### 3.1 Employee Onboarding
1. Navigate to **Admin Studio -> Add User**.
2. Complete the user profile:
    *   First Name & Last Name
    *   Organization Email (Must be unique)
    *   Department Assignment (Select from dropdown)
    *   Initial Role (Assign `EMPLOYEE` or `MANAGER`)
3. Click **Save User**. The database creates the record, triggers standard JWT credentials placeholders, and emails onboarding instructions to the employee.

### 3.2 Department Management
1. Navigate to **Admin Studio -> Departments**.
2. To create a new department: Click **Add Department**, enter Name (e.g., "Quality Assurance"), and click **Save**.
3. To assign employees to a department: Open the department card, click **Add Employees**, check names, and save.

### 3.3 Employee Offboarding
1. Navigate to **Admin Studio**, find the employee.
2. Click **Deactivate Account** (Toggles `is_active = False` in database).
3. Confirm deactivation. The employee is logged out immediately and their tokens are blacklisted. Their progress history is preserved for compliance auditing.

---

## 4. Bulk Operations (Import/Export) [PLANNED]
For large onboarding cohorts, HR Admins can upload a roster:
1. Navigate to **Admin Studio -> Bulk Upload**.
2. Download the CSV template.
3. Fill in fields: `first_name`, `last_name`, `email`, `department`, `role`.
4. Upload CSV and resolve syntax warnings.
