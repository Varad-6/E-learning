# 🔑 Standard Operating Procedure: Login & Auth Portal

**URL Route**: `/login`  
**Version**: 1.0  
**Effective Date**: 09-Jul-2026  
**Audience**: All Platform Users  

---

## 1. Authentication Options
Users can authenticate through two options:
1.  **Learner Portal**: For Employees and Department Managers.
2.  **Admin Studio Portal**: For System Admins, Course Managers, and HR Admins.

---

## 2. Authentication Flow
```
[User Input Credentials] 
         │
         ▼
[Post /api/auth/login] ──(Fails)──► [Display Error Message]
         │ (Success)
         ▼
[Generate JWT Access Token (15m)] + [Refresh Token (7d)]
         │
         ▼
[Redirect to Role Dashboard]
```

---

## 3. Password Reset Procedure (OTP Flow)
1. On the login page, click **Forgot Password**.
2. Enter your registered organization email.
3. Open your inbox to retrieve the 6-digit OTP code (Valid for 5 minutes).
4. Enter the OTP code on the page and verify.
5. Input your new password (Minimum 8 characters, containing uppercase, numbers, and symbols).
6. Click **Confirm Reset** to update credentials.
