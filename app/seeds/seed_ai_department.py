import uuid
import sys
import os
from datetime import datetime, timezone, timedelta

# Ensure python path includes root
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from app.database.session import SessionLocal
from app.models.department import Department
from app.models.role import Role
from app.models.user import User
from app.models.course import Course
from app.models.course_module import CourseModule
from app.models.module_content import ModuleContent
from app.models.course_enrollment import CourseEnrollment
from app.models.exam import Exam, ExamQuestion, ExamSubmission, ExamGrade
from app.models.badge_tier import BadgeTier
from app.core.security import get_password_hash
from app.services.badge_service import BadgeService

def seed_ai_department_data():
    db = SessionLocal()
    try:
        print("🌱 Seeding Artificial Intelligence Department & realistic test dataset...")

        # 1. Create/Ensure AI Department
        ai_dept = db.query(Department).filter(Department.code == "AI").first()
        if not ai_dept:
            ai_dept = Department(
                code="AI",
                name="Artificial Intelligence",
                description="Core AI/ML Research, Foundation Models, MLOps Infrastructure, and Neural System Engineering."
            )
            db.add(ai_dept)
            db.commit()
            db.refresh(ai_dept)
        print(f"✅ Department AI ready (ID: {ai_dept.id})")

        # Roles
        admin_role = db.query(Role).filter(Role.name == "SYSTEM_ADMIN").first()
        mgr_role = db.query(Role).filter(Role.name == "COURSE_MANAGER").first()
        emp_role = db.query(Role).filter(Role.name == "EMPLOYEE").first()

        # 2. Seed Users
        users_def = [
            {"code": "AI-ADM01", "fn": "Elena", "ln": "Rostova", "email": "ai.admin@company.com", "roles": [admin_role]},
            {"code": "AI-MGR01", "fn": "Marcus", "ln": "Vance", "email": "ai.manager@company.com", "roles": [mgr_role]},
            {"code": "AI-EMP01", "fn": "Aria", "ln": "Chen", "email": "aria.chen@company.com", "roles": [emp_role]},
            {"code": "AI-EMP02", "fn": "Devon", "ln": "Kumar", "email": "devon.kumar@company.com", "roles": [emp_role]},
            {"code": "AI-EMP03", "fn": "Sophia", "ln": "Alvarez", "email": "sophia.alvarez@company.com", "roles": [emp_role]},
        ]

        user_instances = {}
        for u in users_def:
            exist_user = db.query(User).filter(User.email == u["email"]).first()
            if not exist_user:
                exist_user = User(
                    employee_code=u["code"],
                    first_name=u["fn"],
                    last_name=u["ln"],
                    email=u["email"],
                    password_hash=get_password_hash("Password123!"),
                    department_id=ai_dept.id,
                    is_active=True,
                    is_deleted=False,
                    must_change_password=False,
                    roles=[r for r in u["roles"] if r]
                )
                db.add(exist_user)
                db.commit()
                db.refresh(exist_user)
            user_instances[u["email"]] = exist_user

        print("✅ 5 AI Department users seeded.")

        creator_user = user_instances["ai.manager@company.com"]

        # 3. Seed 5 Courses (each with 6 modules)
        courses_def = [
            {
                "code": "AI-101",
                "title": "Foundations of Machine Learning & Neural Systems",
                "desc": "Mathematical foundations, convex optimization, gradient descent dynamics, backpropagation, and loss function landscapes.",
                "is_mandatory": True,
                "duration": "14d 0h 0m 0s"
            },
            {
                "code": "AI-201",
                "title": "Natural Language Processing & Large Language Models",
                "desc": "Transformer architecture, Multi-Head Self-Attention, positional encodings, RLHF, preference alignment, and RAG pipelines.",
                "is_mandatory": True,
                "duration": "10d 0h 0m 0s"
            },
            {
                "code": "AI-301",
                "title": "Computer Vision & Multi-Modal Generative Models",
                "desc": "Convolutional networks, Vision Transformers (ViT), Latent Diffusion Models, U-Net denoising, and CLIP embedding spaces.",
                "is_mandatory": False,
                "duration": "7d 0h 0m 0s"
            },
            {
                "code": "AI-401",
                "title": "Reinforcement Learning & Autonomous Decision Agents",
                "desc": "Markov Decision Processes, Q-learning, Policy Gradients, PPO, Monte Carlo Tree Search, and Multi-Agent Orchestration.",
                "is_mandatory": False,
                "duration": "12d 0h 0m 0s"
            },
            {
                "code": "AI-501",
                "title": "Production MLOps, Model Governance & AI Ethics",
                "desc": "Model containerization, Kubernetes serving, TensorRT optimization, feature stores, drift detection, and algorithmic fairness.",
                "is_mandatory": True,
                "duration": "5d 0h 0m 0s"
            }
        ]

        course_instances = []
        for cdata in courses_def:
            c = db.query(Course).filter(Course.course_code == cdata["code"]).first()
            if not c:
                c = Course(
                    course_code=cdata["code"],
                    title=cdata["title"],
                    description=cdata["desc"],
                    difficulty_level="Advanced",
                    is_published=True,
                    status="published",
                    created_by=creator_user.id,
                    department_id=ai_dept.id,
                    is_mandatory=cdata["is_mandatory"],
                    duration=cdata["duration"],
                    priority="High",
                    published_at=datetime.now(timezone.utc)
                )
                db.add(c)
                db.commit()
                db.refresh(c)

                # Add 6 modules for each course
                for m_idx in range(1, 7):
                    mod = CourseModule(
                        course_id=c.id,
                        title=f"Module {m_idx}: Core Principles & Implementation Part {m_idx}",
                        sequence_no=m_idx
                    )
                    db.add(mod)
                    db.commit()
                    db.refresh(mod)

                    # Add 3 content items per module
                    contents = [
                        ("text", f"Lecture Notes & Mathematical Proofs - Part {m_idx}", f"Comprehensive notes covering Module {m_idx} theoretical derivations."),
                        ("url", f"Interactive Google Colab Notebook - Lab {m_idx}", "https://colab.research.google.com/drive/example"),
                        ("file", f"Reference Architecture Blueprint - Module {m_idx}", "architecture_spec.pdf")
                    ]
                    for ct_type, ct_title, ct_val in contents:
                        mc = ModuleContent(
                            module_id=mod.id,
                            title=ct_title,
                            content_type=ct_type,
                            value=ct_val,
                            sequence_no=1
                        )
                        db.add(mc)
                db.commit()
            course_instances.append(c)

        print("✅ 5 AI Courses (with 6 modules each) seeded.")

        # 4. Auto-enroll users & create completed/in-progress enrollments
        for u in user_instances.values():
            for c in course_instances:
                enr = db.query(CourseEnrollment).filter(
                    CourseEnrollment.user_id == u.id,
                    CourseEnrollment.course_id == c.id
                ).first()
                if not enr:
                    enr = CourseEnrollment(
                        user_id=u.id,
                        course_id=c.id,
                        status="completed" if c.course_code in ["AI-101", "AI-201"] else "in_progress",
                        progress_percent=100.0 if c.course_code in ["AI-101", "AI-201"] else 45.0,
                        completed_at=datetime.now(timezone.utc) if c.course_code in ["AI-101", "AI-201"] else None
                    )
                    db.add(enr)
        db.commit()

        # 5. Seed 5 Realistic AI Exams
        exams_def = [
            {
                "title": "AI-101 Certification Exam: Neural Dynamics & Optimization",
                "duration": 45,
                "course_code": "AI-101",
                "questions": [
                    {
                        "text": "Which optimization algorithm adapts learning rates per-parameter using exponential moving averages of squared gradients?",
                        "type": "mcq",
                        "options": ["Standard Stochastic Gradient Descent (SGD)", "Adam (Adaptive Moment Estimation)", "Heavy Ball Momentum", "Nesterov Accelerated Gradient"],
                        "correct": "1"
                    },
                    {
                        "text": "Select ALL valid architectural mechanisms used to mitigate vanishing gradient problems in deep networks:",
                        "type": "msq",
                        "options": ["Residual Skip Connections (ResNet)", "Batch Normalization", "ReLU Activation Functions", "Increasing L2 Weight Decay"],
                        "correct": ["0", "1", "2"]
                    }
                ]
            },
            {
                "title": "AI-201 Certification Exam: Transformer Architecture & LLM Alignment",
                "duration": 60,
                "course_code": "AI-201",
                "questions": [
                    {
                        "text": "What is the time and memory complexity of standard Self-Attention with respect to sequence length N?",
                        "type": "mcq",
                        "options": ["O(N)", "O(N log N)", "O(N^2)", "O(N^3)"],
                        "correct": "2"
                    },
                    {
                        "text": "Which alignment techniques optimize LLM behavior directly from preference datasets?",
                        "type": "msq",
                        "options": ["Direct Preference Optimization (DPO)", "RLHF with PPO", "Greedy Decoding", "Supervised Fine-Tuning (SFT)"],
                        "correct": ["0", "1"]
                    }
                ]
            },
            {
                "title": "AI-301 Certification Exam: Vision Transformers & Diffusion Frameworks",
                "duration": 40,
                "course_code": "AI-301",
                "questions": [
                    {
                        "text": "In Latent Diffusion Models (LDM), in which space does the iterative denoising process occur?",
                        "type": "mcq",
                        "options": ["High-dimensional Pixel Space", "Compressed Latent Feature Space", "Frequency Fourier Domain", "Gradient Momentum Space"],
                        "correct": "1"
                    }
                ]
            },
            {
                "title": "AI-401 Certification Exam: Reinforcement Learning & Agent Control",
                "duration": 50,
                "course_code": "AI-401",
                "questions": [
                    {
                        "text": "What does the Bellman Optimality Equation compute for a target state-action pair?",
                        "type": "mcq",
                        "options": ["Immediate reward only", "Maximum expected return under optimal policy", "Entropy loss penalty", "Discount factor gamma"],
                        "correct": "1"
                    }
                ]
            },
            {
                "title": "AI-501 Certification Exam: MLOps Containerization & Model Governance",
                "duration": 30,
                "course_code": "AI-501",
                "questions": [
                    {
                        "text": "Which metric evaluates statistical divergence between training set feature distributions and live production inference requests?",
                        "type": "mcq",
                        "options": ["Population Stability Index (PSI)", "Mean Squared Error (MSE)", "Precision at K", "Cross-Entropy Loss"],
                        "correct": "0"
                    }
                ]
            }
        ]

        exam_instances = []
        for edata in exams_def:
            ex = db.query(Exam).filter(Exam.title == edata["title"]).first()
            matched_course = db.query(Course).filter(Course.course_code == edata["course_code"]).first()
            if not ex:
                ex = Exam(
                    title=edata["title"],
                    department_id=ai_dept.id,
                    course_id=matched_course.id if matched_course else None,
                    duration_minutes=edata["duration"],
                    created_by=creator_user.id,
                    is_published=True,
                    status="published"
                )
                db.add(ex)
                db.commit()
                db.refresh(ex)

                for qdata in edata["questions"]:
                    eq = ExamQuestion(
                        exam_id=ex.id,
                        question_text=qdata["text"],
                        question_type=qdata["type"],
                        options=qdata["options"],
                        correct_answer=qdata["correct"]
                    )
                    db.add(eq)
                db.commit()
            exam_instances.append(ex)

        print("✅ 5 AI Exams seeded.")

        # 6. Seed Submissions & Grades for Leaderboard & Badge progression
        test_employees = [user_instances["aria.chen@company.com"], user_instances["devon.kumar@company.com"], user_instances["sophia.alvarez@company.com"]]
        scores_map = [
            (9.5, 95.0),
            (8.8, 88.0),
            (7.9, 79.0)
        ]

        for idx, emp in enumerate(test_employees):
            score_tuple = scores_map[idx % len(scores_map)]
            for ex in exam_instances[:3]:
                sub = db.query(ExamSubmission).filter(
                    ExamSubmission.user_id == emp.id,
                    ExamSubmission.exam_id == ex.id
                ).first()
                if not sub:
                    started = datetime.now(timezone.utc) - timedelta(minutes=25)
                    submitted = datetime.now(timezone.utc) - timedelta(minutes=5)
                    sub = ExamSubmission(
                        user_id=emp.id,
                        exam_id=ex.id,
                        status="graded",
                        started_at=started,
                        submitted_at=submitted,
                        answers={"q1": "1", "q2": ["0", "1"]}
                    )
                    db.add(sub)
                    db.commit()
                    db.refresh(sub)

                    grade = ExamGrade(
                        submission_id=sub.id,
                        overall_score=score_tuple[0],
                        overall_feedback="Excellent comprehension of AI core principles and mathematical rigor.",
                        graded_by=creator_user.id,
                        scores={}
                    )
                    db.add(grade)
                    db.commit()

            # Award badges
            BadgeService.check_and_award_badges(db, emp.id)

        print("✅ Seeding completed successfully! Live test data ready.")
    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding AI department test data: {str(e)}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_ai_department_data()
