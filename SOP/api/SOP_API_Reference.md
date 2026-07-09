# 🔗 API Endpoint Reference

**Version**: 1.0  
**Effective Date**: 09-Jul-2026  

---

## 1. Authentication (`/api/auth`)
*   `POST /api/auth/login`: Login credentials verification.
*   `POST /api/auth/refresh`: Token rotation endpoint.

## 2. Administration (`/api/admin`)
*   `GET /api/admin/users`: User grid retrieve.
*   `POST /api/admin/users/{id}/roles`: User role assignments.
