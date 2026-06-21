# Local Development Setup Guide

Follow these steps to set up and run the PostgreSQL database in Docker, migrate the tables, seed the demo users, and start both the backend and frontend.

---

## 1. Start the Database Container in Docker

Make sure Docker Desktop is open and running on your Mac.

### A. Free Port 5432 (If Needed)
If you have another container (like `leetpeers-db`) already using port 5432, stop it first:
```bash
docker stop leetpeers-db
```

### B. Run the PostgreSQL Container
Create and start a new PostgreSQL container named `elearning-db`:
```bash
docker run --name elearning-db -e POSTGRES_DB=elearning -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15
```

---

## 2. Apply Schema Migrations & Seed Users

The backend is configured to use the `.env` file in the project root containing:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/elearning
```

### A. Activate Python Virtual Environment
Open a terminal in the root `E-learning` directory and run:
```bash
source venv/bin/activate
```

### B. Run Database Migrations (Alembic)
Run the migration script to create the required tables:
```bash
alembic upgrade head
```

### C. Seed Test Users
Run the following script to seed the specific credentials:
* **Employee**: `EMP001` / `Employee@1234`
* **Admin**: `ADM001` / `Temp@123`
* **Manager**: `MGR001` / `Manager@123`

```bash
python -c "
from app.database.session import SessionLocal
from app.models.user import User
from app.models.role import Role
from app.models.user_role import UserRole
from app.core.security import get_password_hash
import uuid

db = SessionLocal()
try:
    # Clear old entries to avoid conflicts
    db.query(UserRole).delete()
    db.query(User).delete()
    db.query(Role).delete()
    db.commit()

    # Create Roles
    admin_role = Role(id=uuid.UUID('a0a0a0a0-0000-0000-0000-000000000001'), name='ADMIN')
    manager_role = Role(id=uuid.UUID('a0a0a0a0-0000-0000-0000-000000000002'), name='MANAGER')
    employee_role = Role(id=uuid.UUID('a0a0a0a0-0000-0000-0000-000000000003'), name='EMPLOYEE')
    db.add_all([admin_role, manager_role, employee_role])
    db.commit()

    # Create Users
    emp_user = User(
        id=uuid.UUID('11111111-1111-1111-1111-111111111111'),
        employee_code='EMP001',
        first_name='John',
        last_name='Doe',
        email='john.doe@lms.com',
        password_hash=get_password_hash('Employee@1234'),
        is_active=True,
        is_deleted=False,
        must_change_password=True
    )
    admin_user = User(
        id=uuid.UUID('22222222-2222-2222-2222-222222222222'),
        employee_code='ADM001',
        first_name='Admin',
        last_name='User',
        email='admin@lms.com',
        password_hash=get_password_hash('Temp@123'),
        is_active=True,
        is_deleted=False,
        must_change_password=True
    )
    mgr_user = User(
        id=uuid.UUID('55555555-5555-5555-5555-555555555555'),
        employee_code='MGR001',
        first_name='Manager',
        last_name='User',
        email='manager@lms.com',
        password_hash=get_password_hash('Manager@123'),
        is_active=True,
        is_deleted=False,
        must_change_password=True
    )
    db.add_all([emp_user, admin_user, mgr_user])
    db.commit()

    # Link Users to Roles
    ur1 = UserRole(user_id=emp_user.id, role_id=employee_role.id)
    ur2 = UserRole(user_id=admin_user.id, role_id=admin_role.id)
    ur3 = UserRole(user_id=mgr_user.id, role_id=manager_role.id)
    db.add_all([ur1, ur2, ur3])
    db.commit()
    print('Successfully seeded the database with test users!')
except Exception as e:
    db.rollback()
    print(f'Error seeding: {e}')
finally:
    db.close()
"
```

---

## 3. Run the Backend API

In the terminal tab with the virtual environment active:
```bash
python -m uvicorn app.main:app --port 8000 --reload
```

The backend server will run at [http://127.0.0.1:8000](http://127.0.0.1:8000).

---

## 4. Run the Frontend Dev Server

Open a **new terminal window/tab**, navigate to the `frontend` directory, and run:
```bash
cd frontend
npm install
npm run dev
```

The frontend application will start (usually on [http://localhost:5173](http://localhost:5173) or [http://localhost:5174](http://localhost:5174)).
