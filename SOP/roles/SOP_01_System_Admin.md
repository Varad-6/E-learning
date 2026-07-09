# 🛡️ Standard Operating Procedure: System Admin Role

**Internal Code**: `SYSTEM_ADMIN`  
**Version**: 1.0  
**Effective Date**: 09-Jul-2026  
**Audience**: System Administrators, Developers, DevOps  
**Scope**: Full Platform Management  

---

## 1. Purpose & Scope
This SOP defines the operational guidelines, permissions, and administrative responsibilities of the **System Admin (SYSTEM_ADMIN)** within the Kiezen E-Learning Management System (ELMS). It covers user accounts, roles, departments, system configuration, global course approvals, emergency overrides, and audit checks.

---

## 2. Permissions Overview
The System Admin has unconditional, platform-wide read and write access across all tables, routes, and services. The FastAPI backend implements this globally via the `RequireRoles("SYSTEM_ADMIN")` dependency decorator on restricted endpoints.

---

## 3. Accessible Dashboards & Interfaces
*   **Landing Page**: Admin login portal.
*   **Login Page**: Authentication with password and OTP recovery mechanisms.
*   **Dashboard**: Full access to global statistics:
    *   Active/Inactive user ratios
    *   Course health and status pipeline (Draft, Pending Approval, Approved, Published)
    *   Global completion rates and late submission metrics
*   **Admin Studio**: Access to the user roster, role assignments, department structures, and deactivations.
*   **Course Creator**: Full permissions to create courses, add modules, edit quiz parameters, and publish.

---

## 4. Administrative Procedures

### 4.1 Creating a New User (Onboarding)
1. Navigate to the **Admin Studio**.
2. Click **Add New User**.
3. Input: First Name, Last Name, Email, Department, and initial Role.
4. Click **Create**. The backend saves the record, generates a temporary password, and dispatches a welcome email via the SMTP service.

### 4.2 Assigning System Admin Role (Restricted)
*   **Rule**: *Only* an existing `SYSTEM_ADMIN` can assign the `SYSTEM_ADMIN` role to another user.
1. Navigate to **Admin Studio -> Role Assignment**.
2. Locate the user, select `SYSTEM_ADMIN` from the role dropdown, and click **Save**.

### 4.3 User Deactivation & Deletion
*   **Deactivation**: Blocks authentication while preserving historical training progress, notes, and quiz logs.
    *   Navigate to **Admin Studio -> Users**, locate the user, toggle status to **Inactive**, and click **Save**.
*   **Soft Deletion**: Sets `is_deleted = True` via `DELETE /api/admin/users/{user_id}`.
    *   Used for offboarding. Block login immediately, hide profile from roster lists, but keep database records to maintain audit trails of past course progress.

### 4.4 Emergency Timed Course Access Unlock
If an employee is locked out of an assigned course because they missed the deadline:
1. Locate the employee's enrollment under **Admin Studio -> Enrollments**.
2. Click **Override Access**.
3. Select a new extension date (e.g., +3 days) and click **Confirm Unlock**.
4. The backend resets the `locked` status, updating the user progress block to `in_progress`.

---

## 5. Do's and Don'ts
*   ✅ **Do** verify identities before resetting passwords or unlocking course locks.
*   ✅ **Do** keep the HR registry in sync by soft-deleting employees who have left the organization.
*   ❌ **Never** modify database tables directly unless under emergency circumstances. Always use the Admin Studio or backend APIs to ensure audit logs are generated.
