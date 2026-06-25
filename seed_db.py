import uuid
from app.database.session import SessionLocal
from app.models.user import User
from app.models.role import Role
from app.models.user_role import UserRole
from app.models.department import Department
from app.core.security import get_password_hash

db = SessionLocal()
try:
    # Clear old entries to avoid conflicts (respecting FK order)
    db.query(UserRole).delete()
    db.query(User).delete()
    db.query(Department).delete()
    db.query(Role).delete()
    db.commit()

    # Create Departments
    dept_ai = Department(
        id=uuid.UUID('d00d00d0-0000-0000-0000-000000000001'),
        code='AI',
        name='Artificial Intelligence',
        description='AI and Machine Learning engineering department'
    )
    dept_fico = Department(
        id=uuid.UUID('d00d00d0-0000-0000-0000-000000000002'),
        code='FICO',
        name='FICO Finance',
        description='Financial Accounting and Controlling department'
    )
    dept_abap = Department(
        id=uuid.UUID('d00d00d0-0000-0000-0000-000000000003'),
        code='ABAP',
        name='ABAP Development',
        description='ABAP programming department'
    )
    dept_hr = Department(
        id=uuid.UUID('d00d00d0-0000-0000-0000-000000000004'),
        code='HR',
        name='HR and Admin',
        description='Human Resources and Administration department'
    )
    db.add_all([dept_ai, dept_fico, dept_abap, dept_hr])
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
        department_id=dept_ai.id,
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
        department_id=dept_hr.id,
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
        department_id=dept_ai.id,
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
    print('Successfully seeded database with departments, roles, and test users!')
except Exception as e:
    db.rollback()
    print(f'Error seeding: {e}')
finally:
    db.close()
