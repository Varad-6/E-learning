import uuid
from app.database.session import SessionLocal
from app.models.user import User
from app.models.role import Role
from app.models.user_role import UserRole
from app.models.department import Department
from app.core.security import get_password_hash

db = SessionLocal()
try:
    # Check and Create Departments
    depts = {
        'AI': {
            'id': uuid.UUID('d00d00d0-0000-0000-0000-000000000001'),
            'name': 'Artificial Intelligence',
            'description': 'AI and Machine Learning engineering department'
        },
        'FICO': {
            'id': uuid.UUID('d00d00d0-0000-0000-0000-000000000002'),
            'name': 'FICO Finance',
            'description': 'Financial Accounting and Controlling department'
        },
        'ABAP': {
            'id': uuid.UUID('d00d00d0-0000-0000-0000-000000000003'),
            'name': 'ABAP Development',
            'description': 'ABAP programming department'
        },
        'HR': {
            'id': uuid.UUID('d00d00d0-0000-0000-0000-000000000004'),
            'name': 'HR and Admin',
            'description': 'Human Resources and Administration department'
        }
    }
    
    db_depts = {}
    for code, info in depts.items():
        dept = db.query(Department).filter(Department.code == code).first()
        if not dept:
            dept = Department(
                id=info['id'],
                code=code,
                name=info['name'],
                description=info['description']
            )
            db.add(dept)
            db.commit()
            db.refresh(dept)
        db_depts[code] = dept

    # Check and Create Roles
    role_names = ['ADMIN', 'MANAGER', 'EMPLOYEE']
    role_ids = {
        'ADMIN': uuid.UUID('a0a0a0a0-0000-0000-0000-000000000001'),
        'MANAGER': uuid.UUID('a0a0a0a0-0000-0000-0000-000000000002'),
        'EMPLOYEE': uuid.UUID('a0a0a0a0-0000-0000-0000-000000000003')
    }
    
    db_roles = {}
    for r_name in role_names:
        role = db.query(Role).filter(Role.name == r_name).first()
        if not role:
            role = Role(id=role_ids[r_name], name=r_name)
            db.add(role)
            db.commit()
            db.refresh(role)
        db_roles[r_name] = role

    # Check and Create Users
    users_data = [
        {
            'id': uuid.UUID('11111111-1111-1111-1111-111111111111'),
            'employee_code': 'EMP001',
            'first_name': 'John',
            'last_name': 'Doe',
            'email': 'john.doe@lms.com',
            'password_hash': get_password_hash('Employee@1234'),
            'department_id': db_depts['AI'].id,
            'role': 'EMPLOYEE'
        },
        {
            'id': uuid.UUID('22222222-2222-2222-2222-222222222222'),
            'employee_code': 'ADM001',
            'first_name': 'Admin',
            'last_name': 'User',
            'email': 'admin@lms.com',
            'password_hash': get_password_hash('Temp@123'),
            'department_id': db_depts['HR'].id,
            'role': 'ADMIN'
        },
        {
            'id': uuid.UUID('55555555-5555-5555-5555-555555555555'),
            'employee_code': 'MGR001',
            'first_name': 'Manager',
            'last_name': 'User',
            'email': 'manager@lms.com',
            'password_hash': get_password_hash('Manager@123'),
            'department_id': db_depts['AI'].id,
            'role': 'MANAGER'
        }
    ]

    for u_info in users_data:
        user = db.query(User).filter(User.employee_code == u_info['employee_code']).first()
        if not user:
            user = User(
                id=u_info['id'],
                employee_code=u_info['employee_code'],
                first_name=u_info['first_name'],
                last_name=u_info['last_name'],
                email=u_info['email'],
                password_hash=u_info['password_hash'],
                department_id=u_info['department_id'],
                is_active=True,
                is_deleted=False,
                must_change_password=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
            # Link Role
            ur = UserRole(user_id=user.id, role_id=db_roles[u_info['role']].id)
            db.add(ur)
            db.commit()
        else:
            # Check if role link exists, if not add it
            role_obj = db_roles[u_info['role']]
            role_link = db.query(UserRole).filter(
                UserRole.user_id == user.id, 
                UserRole.role_id == role_obj.id
            ).first()
            if not role_link:
                ur = UserRole(user_id=user.id, role_id=role_obj.id)
                db.add(ur)
                db.commit()

    print('Successfully seeded/updated database with departments, roles, and test users!')
except Exception as e:
    db.rollback()
    print(f'Error seeding: {e}')
finally:
    db.close()
