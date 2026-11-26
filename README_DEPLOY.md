# Kaizen Enterprise LMS - Complete Deployment Guide

This package contains the full **Kaizen Enterprise E-Learning & LMS** platform (PostgreSQL 16, FastAPI Backend, React Frontend, and the complete database dump with all 108 enterprise users).

---

## 🚀 Quick Redeployment (1 Command)

### On Windows:
Double-click `deploy.bat`  
*OR* run in PowerShell / Command Prompt:
```powershell
docker compose down ; docker compose up -d --build
```

### On Linux / macOS:
```bash
chmod +x deploy.sh restore_database.sh
./deploy.sh
```
*OR* run directly:
```bash
docker compose down && docker compose up -d --build
```

---

## 🌐 Access URLs

| Application | URL |
| :--- | :--- |
| **Learner & Staff Portal** | [http://localhost:5173](http://localhost:5173) |
| **User Admin Studio (All 108 Users)** | [http://localhost:5173/admin/users](http://localhost:5173/admin/users) |
| **Backend API Documentation** | [http://localhost:8000/docs](http://localhost:8000/docs) |
| **Health Check** | [http://localhost:8000/health](http://localhost:8000/health) |

---

## 🔑 Login Credentials

### 1. System Administrator (Full Access to http://localhost:5173/admin/users)
- **Email:** `systemadmin@abhiyantatech.com`
- **Password:** `Password123!`

### 2. Alternative System Administrator
- **Email:** `akanksha.k@abhiyantatech.com`
- **Password:** `Password123!`

### 3. HR Administrator
- **Email:** `sayali.s@abhiyantatech.com`
- **Password:** `Password123!`

### 4. Sample Department Employee (AI Dept)
- **Email:** `Arati.D@abhiyantatech.com`
- **Password:** `Password123!`

*(Note: All standard accounts use `Password123!`)*

---

## 🗄️ Database Auto-Initialization & Manual Restore

The complete database dump is located at:
`init-db/01-init.sql`

1. **Automatic Initialization**:
   Whenever `docker compose up -d` starts for the first time or with clean volumes, PostgreSQL automatically loads `init-db/01-init.sql`.

2. **Manual Restore Anytime**:
   If you ever want to re-load or reset the exact 108 users and curriculum on a running container:
   - On Windows: Double-click `restore_database.bat`
   - On Linux/Mac: `./restore_database.sh`
   - Command:
     ```bash
     docker exec -i elearning-postgres psql -U elearning_user -d elearning < init-db/01-init.sql
     ```

---

## 📦 Container Topology

- **`elearning-frontend`**: Port `5173 -> 80` (Nginx serving React SPA + Reverse Proxy to API)
- **`elearning-backend`**: Port `8000 -> 8000` (FastAPI, Uvicorn, Python 3.11)
- **`elearning-postgres`**: Port `5432` (PostgreSQL 16)
