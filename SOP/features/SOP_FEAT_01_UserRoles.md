# 🔐 Features & Capabilities: User Roles & Access Control

**Version**: 1.0  
**Effective Date**: 09-Jul-2026  
**Audience**: System Admins, Developers, Audit Teams  

---

## 1. Role Definitions
*   `SYSTEM_ADMIN`: Root privileges.
*   `COURSE_MANAGER`: Training content and publishing workflows.
*   `HR_ADMIN`: Directory management, user setups, and departments.
*   `MANAGER`: Department dashboards and learning reports.
*   `EMPLOYEE`: Learners, note-taking, and quiz attempts.

---

## 2. Global Access Matrix
| Feature / Endpoint Group | SYSTEM_ADMIN | COURSE_MANAGER | HR_ADMIN | MANAGER | EMPLOYEE |
|---|:---:|:---:|:---:|:---:|:---:|
| User Directory CRUD | ✅ | ❌ | ✅ | ❌ | ❌ |
| Role Assignment | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create Course (Draft) | ✅ | ✅ | ❌ | ❌ | ✅ |
| Approve / Publish Course| ✅ | ✅ | ❌ | ❌ | ❌ |
| Department Setup | ✅ | ❌ | ✅ | ❌ | ❌ |
| Team Progress Reports | ✅ | ✅ | ❌ | ✅ | ❌ |
| Take Quizzes / Take Notes | ✅ | ✅ | ❌ | ❌ | ✅ |
