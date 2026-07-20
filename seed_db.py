import uuid
from app.database.session import SessionLocal
from app.models.user import User
from app.models.role import Role
from app.models.user_role import UserRole
from app.models.department import Department
from app.models.course import Course
from app.models.course_module import CourseModule
from app.models.module_content import ModuleContent
from app.models.quiz import Quiz
from app.models.quiz_question import QuizQuestion
from app.models.exam import Exam, ExamQuestion, ExamAssignment, ExamReview, ExamSubmission, ExamGrade
from app.models.course_enrollment import CourseEnrollment
from app.models.user_course_progress import UserCourseProgress
from app.models.user_badge import UserBadge
from app.models.otp import PasswordResetOTP
from app.models.refresh_token import RefreshToken
from app.models.audit_log import AuditLog
from app.models.notification import Notification
from app.models.user_module_note import UserModuleNote
from app.core.security import get_password_hash

db = SessionLocal()
try:
    print("Clearing database tables for clean seed...")
    # Delete in child-to-parent order to respect FK constraints
    db.query(AuditLog).delete()
    db.query(Notification).delete()
    db.query(UserModuleNote).delete()
    db.query(UserBadge).delete()
    db.query(UserCourseProgress).delete()
    db.query(CourseEnrollment).delete()
    db.query(ExamGrade).delete()
    db.query(ExamSubmission).delete()
    db.query(ExamReview).delete()
    db.query(ExamAssignment).delete()
    db.query(ExamQuestion).delete()
    db.query(Exam).delete()
    db.query(QuizQuestion).delete()
    db.query(Quiz).delete()
    db.query(ModuleContent).delete()
    db.query(CourseModule).delete()
    db.query(Course).delete()
    db.query(PasswordResetOTP).delete()
    db.query(RefreshToken).delete()
    db.query(UserRole).delete()
    db.query(User).delete()
    db.query(Role).delete()
    db.query(Department).delete()
    db.commit()
    print("Database cleared.")

    # Create Departments
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

    # Create Roles
    role_names = ['SYSTEM_ADMIN', 'HR_ADMIN', 'COURSE_MANAGER', 'EMPLOYEE']
    role_ids = {
        'SYSTEM_ADMIN': uuid.UUID('a0a0a0a0-0000-0000-0000-000000000001'),
        'COURSE_MANAGER': uuid.UUID('a0a0a0a0-0000-0000-0000-000000000002'),
        'EMPLOYEE': uuid.UUID('a0a0a0a0-0000-0000-0000-000000000003'),
        'HR_ADMIN': uuid.UUID('a0a0a0a0-0000-0000-0000-000000000004')
    }
    
    db_roles = {}
    for r_name in role_names:
        role = Role(id=role_ids[r_name], name=r_name)
        db.add(role)
        db.commit()
        db.refresh(role)
        db_roles[r_name] = role

    # Create Core/Default Admin and HR Users
    admin_user = User(
        id=uuid.UUID('22222222-2222-2222-2222-222222222222'),
        employee_code='ADM001',
        first_name='Admin',
        last_name='User',
        email='admin@lms.com',
        password_hash=get_password_hash('Temp@123'),
        is_active=True,
        is_deleted=False,
        must_change_password=True,
        department_id=db_depts['HR'].id
    )
    db.add(admin_user)
    db.commit()
    db.add(UserRole(user_id=admin_user.id, role_id=db_roles['SYSTEM_ADMIN'].id))

    hr_admin_user = User(
        id=uuid.UUID('77777777-7777-7777-7777-777777777777'),
        employee_code='HR001',
        first_name='HR Admin',
        last_name='User',
        email='hr@lms.com',
        password_hash=get_password_hash('HrAdmin@123'),
        is_active=True,
        is_deleted=False,
        must_change_password=True,
        department_id=db_depts['HR'].id
    )
    db.add(hr_admin_user)
    db.commit()
    db.add(UserRole(user_id=hr_admin_user.id, role_id=db_roles['HR_ADMIN'].id))
    db.commit()

    # Seed 4 Employees & 2 Managers per department
    print("Seeding department users...")
    password_hash = get_password_hash("Kiezen@123")
    
    # Track a manager for course authoring
    dept_managers = {}

    for code, dept in db_depts.items():
        dept_managers[code] = []
        # Seed 2 Managers
        for m_idx in range(1, 3):
            mgr_id = uuid.uuid4()
            mgr_code = f"{code}_MGR0{m_idx}"
            mgr = User(
                id=mgr_id,
                employee_code=mgr_code,
                first_name=f"{code} Mgr{m_idx}",
                last_name="User",
                email=f"{code.lower()}.mgr{m_idx}@lms.com",
                password_hash=password_hash,
                is_active=True,
                is_deleted=False,
                must_change_password=True,
                department_id=dept.id
            )
            db.add(mgr)
            db.commit()
            db.add(UserRole(user_id=mgr.id, role_id=db_roles['COURSE_MANAGER'].id))
            db.commit()
            dept_managers[code].append(mgr)

        # Seed 4 Employees
        for e_idx in range(1, 5):
            emp_id = uuid.uuid4()
            emp_code = f"{code}_EMP0{e_idx}"
            emp = User(
                id=emp_id,
                employee_code=emp_code,
                first_name=f"{code} Emp{e_idx}",
                last_name="User",
                email=f"{code.lower()}.emp{e_idx}@lms.com",
                password_hash=password_hash,
                is_active=True,
                is_deleted=False,
                must_change_password=True,
                department_id=dept.id
            )
            db.add(emp)
            db.commit()
            db.add(UserRole(user_id=emp.id, role_id=db_roles['EMPLOYEE'].id))
            db.commit()

    # Seed 2 Detailed Courses per department with 20-day duration
    print("Seeding courses, modules, contents and quizzes...")
    courses_seed_data = {
        'AI': [
            {
                'course_code': 'AI-101',
                'title': 'Artificial Intelligence Foundations',
                'description': 'Core principles of machine learning models, search algorithms, logic programming, and AI ethics.',
                'modules': [
                    {
                        'title': 'Introduction to AI & Search Algorithms',
                        'contents': [
                            {'title': 'Overview of Machine Learning Systems', 'type': 'article', 'val': 'This article covers baseline concepts of artificial intelligence.'},
                            {'title': 'Visualizing BFS & DFS in Pathfinding', 'type': 'video', 'val': 'https://www.youtube.com/embed/dQw4w9WgXcQ'}
                        ]
                    },
                    {
                        'title': 'Introduction to Machine Learning Models',
                        'contents': [
                            {'title': 'Supervised vs Unsupervised Learning Guide', 'type': 'document', 'val': 'Detailed PDF handbook regarding linear regression.'}
                        ]
                    }
                ]
            },
            {
                'course_code': 'AI-201',
                'title': 'Neural Networks and Deep Learning',
                'description': 'A practical deep-dive guide to constructing CNNs, RNNs, and Transformers using PyTorch framework.',
                'modules': [
                    {
                        'title': 'Deep Neural Networks Foundations',
                        'contents': [
                            {'title': 'Forward & Backward Propagation Calculus', 'type': 'article', 'val': 'Mathematical walkthrough of derivative weights updating.'}
                        ]
                    }
                ]
            }
        ],
        'FICO': [
            {
                'course_code': 'FICO-101',
                'title': 'Financial Accounting Principles',
                'description': 'Introduction to ledger balances, trial logs, financial statements, and balance sheet orchestration.',
                'modules': [
                    {
                        'title': 'General Ledger Accounting Basics',
                        'contents': [
                            {'title': 'Double Entry Ledger System Structure', 'type': 'article', 'val': 'Debits and credits explanation.'}
                        ]
                    }
                ]
            },
            {
                'course_code': 'FICO-202',
                'title': 'SAP FICO Ledger & Cost Control',
                'description': 'Configuring profit-centers, asset ledgers, internal codes, and ledger cost calculations in SAP NetWeaver.',
                'modules': [
                    {
                        'title': 'Cost Centers & Internal Orders',
                        'contents': [
                            {'title': 'SAP Cost Allocations Tutorial', 'type': 'video', 'val': 'https://www.youtube.com/embed/dQw4w9WgXcQ'}
                        ]
                    }
                ]
            }
        ],
        'ABAP': [
            {
                'course_code': 'ABAP-101',
                'title': 'SAP ABAP Programming Basics',
                'description': 'Learn syntax parameters, logic control flows, internal dictionary variables, and tables in SAP environments.',
                'modules': [
                    {
                        'title': 'ABAP Syntax & Data Dictionary',
                        'contents': [
                            {'title': 'Declaring Internal Tables & Work Areas', 'type': 'article', 'val': 'Introductory variables declaration tutorial.'}
                        ]
                    }
                ]
            },
            {
                'course_code': 'ABAP-301',
                'title': 'Advanced ABAP & Database Orchestration',
                'description': 'Orchestrating custom SAP database views, remote function calls, BAPIs, and Web Dynpro custom dashboards.',
                'modules': [
                    {
                        'title': 'BAPIs & RFC Database Integrations',
                        'contents': [
                            {'title': 'Building Remote Function Calls Walkthrough', 'type': 'document', 'val': 'Configuring RFC protocols.'}
                        ]
                    }
                ]
            }
        ],
        'HR': [
            {
                'course_code': 'HR-101',
                'title': 'Corporate HR & Recruitment Strategies',
                'description': 'Sourcing strategies, payroll structures, hiring funnels, onboarding checklists, and labor law regulations.',
                'modules': [
                    {
                        'title': 'Talent Acquisition & Employee Funnels',
                        'contents': [
                            {'title': 'Structuring Modern Hiring Campaigns', 'type': 'article', 'val': 'Modern recruitment methods.'}
                        ]
                    }
                ]
            },
            {
                'course_code': 'HR-202',
                'title': 'Employee Relations and Labor Laws',
                'description': 'Workplace arbitration, state compliance guides, payroll taxes, benefit rules, and employee feedback loops.',
                'modules': [
                    {
                        'title': 'Arbitration & State Legal Compliance',
                        'contents': [
                            {'title': 'Workplace Dispute Resolution Rules', 'type': 'document', 'val': 'Legal practices handbook.'}
                        ]
                    }
                ]
            }
        ]
    }

    for dept_code, courses_list in courses_seed_data.items():
        mgr = dept_managers[dept_code][0]
        dept = db_depts[dept_code]
        
        for c_data in courses_list:
            c = Course(
                id=uuid.uuid4(),
                course_code=c_data['course_code'],
                title=c_data['title'],
                description=c_data['description'],
                difficulty_level='Beginner',
                is_published=True,
                created_by=mgr.id,
                department_id=dept.id,
                status='approved',
                duration='20d 0h 0m 0s',
                priority='Medium',
                is_mandatory=True
            )
            db.add(c)
            db.commit()
            db.refresh(c)
            
            # Add Modules and ModuleContent
            for m_seq, m_data in enumerate(c_data['modules'], start=1):
                mod = CourseModule(
                    id=uuid.uuid4(),
                    course_id=c.id,
                    title=m_data['title'],
                    description=f"Module content focusing on {m_data['title']}",
                    sequence_no=m_seq,
                    tier='beginner'
                )
                db.add(mod)
                db.commit()
                db.refresh(mod)
                
                # Add Contents
                for c_seq, c_info in enumerate(m_data['contents'], start=1):
                    mc = ModuleContent(
                        id=uuid.uuid4(),
                        module_id=mod.id,
                        title=c_info['title'],
                        content_type=c_info['type'],
                        file_path=None if c_info['type'] != 'video' else c_info['val'],
                        value=c_info['val'] if c_info['type'] != 'video' else None,
                        label=c_info['title'],
                        duration_seconds=300 if c_info['type'] == 'video' else 600,
                        sequence_no=c_seq,
                        is_active=True
                    )
                    db.add(mc)
                
                # Add default quiz for the module
                quiz = Quiz(
                    id=uuid.uuid4(),
                    module_id=mod.id,
                    title=f"Assessment checkpoint - {mod.title}",
                    passing_score=80,
                    time_limit_minutes=15,
                    is_published=True
                )
                db.add(quiz)
                db.commit()
                db.refresh(quiz)
                
                # Add Quiz questions
                q1 = QuizQuestion(
                    id=uuid.uuid4(),
                    quiz_id=quiz.id,
                    question_text=f"What is the key takeaway of {mod.title}?",
                    options=["Option A (Correct)", "Option B", "Option C", "Option D"],
                    correct_answer="Option A (Correct)",
                    explanation="Option A represents the baseline concept presented in this module syllabus.",
                    points=10
                )
                db.add(q1)
                db.commit()

    print("Successfully seeded/updated database with departments, roles, test users, courses, modules, contents and quizzes!")
except Exception as e:
    db.rollback()
    print(f"Error seeding: {e}")
finally:
    db.close()
