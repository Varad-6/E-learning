import asyncio
import json
import os
import tempfile
import unittest
import uuid
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Compile PostgreSQL-specific column types cleanly on SQLite for fast isolated tests
@compiles(PG_UUID, "sqlite")
def _compile_pg_uuid_sqlite(type_, compiler, **kw):
    return "CHAR(36)"


@compiles(JSONB, "sqlite")
def _compile_pg_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"


# Force non-production test environment before importing app modules
os.environ.setdefault("ENVIRONMENT", "test")

import app.models  # noqa: E402, F401
from app.core.config import Settings, settings  # noqa: E402
from app.core.dependencies import get_db  # noqa: E402
from app.core.rate_limit import rate_limiter  # noqa: E402
from app.core.security import create_access_token, get_password_hash  # noqa: E402
from app.database.base import Base  # noqa: E402
from app.main import app  # noqa: E402
from app.models.course import Course  # noqa: E402
from app.models.course_enrollment import CourseEnrollment  # noqa: E402
from app.models.course_module import CourseModule  # noqa: E402
from app.models.department import Department  # noqa: E402
from app.models.exam import Exam, ExamQuestion, ExamSubmission  # noqa: E402
from app.models.module_content import ModuleContent  # noqa: E402
from app.models.quiz import Quiz  # noqa: E402
from app.models.quiz_question import QuizQuestion  # noqa: E402
from app.models.refresh_token import RefreshToken  # noqa: E402
from app.models.role import Role  # noqa: E402
from app.models.user import User  # noqa: E402
from app.services.otp_service import OTPService  # noqa: E402


class ASGITestResponse:
    def __init__(self, status_code: int, headers: dict, body: bytes):
        self.status_code = status_code
        self.headers = headers
        self.body = body

    def json(self):
        return json.loads(self.body.decode("utf-8"))

    @property
    def text(self) -> str:
        return self.body.decode("utf-8", errors="replace")


def asgi_request(method: str, path: str, headers=None, json_body=None, body: bytes = b"", query: dict = None) -> ASGITestResponse:
    """Invoke the FastAPI ASGI application directly without external HTTP dependencies."""
    raw_headers = []
    hdrs = dict(headers or {})
    if json_body is not None:
        body = json.dumps(json_body).encode("utf-8")
        hdrs.setdefault("content-type", "application/json")
    for k, v in hdrs.items():
        raw_headers.append((k.lower().encode("latin-1"), str(v).encode("latin-1")))

    query_string = urlencode(query or {}).encode("latin-1")

    async def _run():
        sent = False
        response_status = 500
        response_headers = {}
        response_chunks = []

        async def receive():
            nonlocal sent
            if not sent:
                sent = True
                return {"type": "http.request", "body": body, "more_body": False}
            return {"type": "http.disconnect"}

        async def send(message):
            nonlocal response_status, response_headers
            if message["type"] == "http.response.start":
                response_status = message["status"]
                response_headers = {
                    k.decode("latin-1").lower(): v.decode("latin-1")
                    for k, v in message.get("headers", [])
                }
            elif message["type"] == "http.response.body":
                response_chunks.append(message.get("body", b""))

        scope = {
            "type": "http",
            "asgi": {"version": "3.0"},
            "http_version": "1.1",
            "method": method.upper(),
            "scheme": "https",
            "path": path,
            "raw_path": path.encode("latin-1"),
            "query_string": query_string,
            "headers": raw_headers,
            "client": ("127.0.0.1", 50000),
            "server": ("testserver", 80),
        }
        await app(scope, receive, send)
        return ASGITestResponse(response_status, response_headers, b"".join(response_chunks))

    return asyncio.run(_run())


def multipart_upload(field_name: str, filename: str, content_type: str, data: bytes):
    boundary = "----KaizenTestBoundary7MA4YWxkTrZu0gW"
    lines = [
        f"--{boundary}".encode(),
        f'Content-Disposition: form-data; name="{field_name}"; filename="{filename}"'.encode(),
        f"Content-Type: {content_type}".encode(),
        b"",
        data,
        f"--{boundary}--".encode(),
        b"",
    ]
    body = b"\r\n".join(lines)
    return body, f"multipart/form-data; boundary={boundary}"


class ProductionHardeningTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(cls.engine)
        cls.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)
        cls.tmp_upload_dir = tempfile.mkdtemp(prefix="kaizen_test_uploads_")
        cls._orig_upload_dir = settings.UPLOAD_DIR
        settings.UPLOAD_DIR = cls.tmp_upload_dir

        def override_get_db():
            db = cls.SessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.clear()
        settings.UPLOAD_DIR = cls._orig_upload_dir
        cls.engine.dispose()

    def setUp(self):
        Base.metadata.drop_all(self.engine)
        Base.metadata.create_all(self.engine)
        rate_limiter.reset()
        self.db = self.SessionLocal()

        self.dept_ai = Department(id=uuid.uuid4(), name="Artificial Intelligence", code="AI", description="AI")
        self.dept_hr = Department(id=uuid.uuid4(), name="Human Resources", code="HR", description="HR")
        self.db.add_all([self.dept_ai, self.dept_hr])

        self.role_admin = Role(id=uuid.uuid4(), name="SYSTEM_ADMIN")
        self.role_emp = Role(id=uuid.uuid4(), name="EMPLOYEE")
        self.role_mgr = Role(id=uuid.uuid4(), name="COURSE_MANAGER")
        self.db.add_all([self.role_admin, self.role_emp, self.role_mgr])
        self.db.commit()

        self.admin = User(
            id=uuid.uuid4(),
            employee_code="ADM001",
            first_name="Sys",
            last_name="Admin",
            email="admin@abhiyantatech.com",
            password_hash=get_password_hash("Password123!"),
            department_id=None,
            is_active=True,
            is_deleted=False,
            email_verified=True,
            must_change_password=False,
            roles=[self.role_admin],
        )
        self.employee = User(
            id=uuid.uuid4(),
            employee_code="EMP001",
            first_name="Alice",
            last_name="Learner",
            email="alice@abhiyantatech.com",
            password_hash=get_password_hash("Password123!"),
            department_id=self.dept_ai.id,
            is_active=True,
            is_deleted=False,
            email_verified=True,
            must_change_password=False,
            roles=[self.role_emp],
        )
        self.other_employee = User(
            id=uuid.uuid4(),
            employee_code="EMP002",
            first_name="Bob",
            last_name="Other",
            email="bob@abhiyantatech.com",
            password_hash=get_password_hash("Password123!"),
            department_id=self.dept_hr.id,
            is_active=True,
            is_deleted=False,
            email_verified=True,
            must_change_password=False,
            roles=[self.role_emp],
        )
        self.db.add_all([self.admin, self.employee, self.other_employee])
        self.db.commit()

        self.admin_token = create_access_token({"user_id": str(self.admin.id), "roles": ["SYSTEM_ADMIN"]})
        self.emp_token = create_access_token({"user_id": str(self.employee.id), "roles": ["EMPLOYEE"]})
        self.other_emp_token = create_access_token({"user_id": str(self.other_employee.id), "roles": ["EMPLOYEE"]})

    def tearDown(self):
        self.db.close()

    def test_production_secret_validation(self):
        bad = Settings(ENVIRONMENT="production")
        with self.assertRaises(RuntimeError):
            bad.validate_production_security()

        good = Settings(
            ENVIRONMENT="production",
            SECRET_KEY="a" * 48,
            REFRESH_SECRET_KEY="b" * 48,
            ALLOWED_ORIGINS="https://kaizen.abhiyantatech.com",
        )
        good.validate_production_security()
        self.assertEqual(good.allowed_origins_list, ["https://kaizen.abhiyantatech.com"])

    def test_cors_blocks_untrusted_origins_and_sets_security_headers(self):
        res_evil = asgi_request("GET", "/health-nonexistent", headers={"origin": "https://evil.example.com"})
        self.assertEqual(res_evil.status_code, 404)
        self.assertNotIn("access-control-allow-origin", res_evil.headers)
        self.assertEqual(res_evil.headers.get("x-content-type-options"), "nosniff")
        self.assertEqual(res_evil.headers.get("x-frame-options"), "DENY")

        res_ok = asgi_request("GET", "/health-nonexistent", headers={"origin": "https://kaizen.abhiyantatech.com"})
        self.assertEqual(res_ok.headers.get("access-control-allow-origin"), "https://kaizen.abhiyantatech.com")

    def test_forgot_password_hides_otp_and_revokes_tokens_on_change(self):
        # 1. Forgot password does not return dev_otp and does not leak missing email
        res = asgi_request("POST", "/api/auth/forgot-password", json_body={"email": "nobody@abhiyantatech.com"})
        self.assertEqual(res.status_code, 200)
        self.assertNotIn("dev_otp", res.json())

        res2 = asgi_request("POST", "/api/auth/forgot-password", json_body={"email": self.employee.email})
        self.assertEqual(res2.status_code, 200)
        self.assertNotIn("dev_otp", res2.json())

        # 2. Generating a second OTP invalidates the first
        otp1 = OTPService.generate_otp(self.db, self.employee.id)
        otp2 = OTPService.generate_otp(self.db, self.employee.id)
        self.assertNotEqual(otp1, otp2)
        res_old = asgi_request("POST", "/api/auth/verify-otp", json_body={"email": self.employee.email, "otp": otp1})
        self.assertEqual(res_old.status_code, 400)
        res_new = asgi_request("POST", "/api/auth/verify-otp", json_body={"email": self.employee.email, "otp": otp2})
        self.assertEqual(res_new.status_code, 200)

        # 3. Changing password revokes active refresh tokens
        rt = RefreshToken(
            user_id=self.employee.id,
            token="sample-refresh-token-value",
            expires_at=datetime.now(timezone.utc) + timedelta(days=5),
            is_revoked=False,
        )
        self.db.add(rt)
        self.db.commit()

        ch_res = asgi_request(
            "POST",
            "/api/auth/change-password",
            headers={"authorization": f"Bearer {self.emp_token}"},
            json_body={"current_password": "Password123!", "new_password": "NewStrongPassword1!"},
        )
        self.assertEqual(ch_res.status_code, 200)
        self.db.refresh(rt)
        self.assertTrue(rt.is_revoked)

    def test_login_does_not_assign_department_and_rate_limits(self):
        # Admin has department_id=None; passing department_id during login must not mutate it
        no_dept_emp = User(
            id=uuid.uuid4(),
            employee_code="EMP099",
            first_name="No",
            last_name="Dept",
            email="nodept@abhiyantatech.com",
            password_hash=get_password_hash("Password123!"),
            department_id=None,
            is_active=True,
            is_deleted=False,
            email_verified=True,
            must_change_password=False,
            roles=[self.role_emp],
        )
        self.db.add(no_dept_emp)
        self.db.commit()

        res = asgi_request(
            "POST",
            "/api/auth/login",
            json_body={"email": "nodept@abhiyantatech.com", "password": "Password123!", "department_id": str(self.dept_ai.id)},
        )
        self.assertEqual(res.status_code, 200)
        self.db.refresh(no_dept_emp)
        self.assertIsNone(no_dept_emp.department_id)

        # Verify rate limiter triggers 429 when exceeded (temporarily switch env out of test)
        orig_env = settings.ENVIRONMENT
        try:
            settings.ENVIRONMENT = "production"
            rate_limiter.reset()
            for i in range(10):
                r = asgi_request("POST", "/api/auth/login", json_body={"email": "bad@abhiyantatech.com", "password": "wrong"})
                self.assertEqual(r.status_code, 401)
            blocked = asgi_request("POST", "/api/auth/login", json_body={"email": "bad@abhiyantatech.com", "password": "wrong"})
            self.assertEqual(blocked.status_code, 429)
        finally:
            settings.ENVIRONMENT = orig_env
            rate_limiter.reset()

    def test_login_email_is_case_insensitive(self):
        # Stored email is lowercase "alice@abhiyantatech.com", login with mixed-case & spaces
        res = asgi_request(
            "POST",
            "/api/auth/login",
            json_body={"email": "  Alice@AbhiyantaTech.COM ", "password": "Password123!"},
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["user"]["email"], "alice@abhiyantatech.com")

    def test_rbac_notification_jobs_and_soft_delete(self):
        res_emp = asgi_request(
            "POST",
            "/api/notifications/jobs/weekly-digest",
            headers={"authorization": f"Bearer {self.emp_token}"},
        )
        self.assertEqual(res_emp.status_code, 403)

        res_admin = asgi_request(
            "POST",
            "/api/notifications/jobs/weekly-digest",
            headers={"authorization": f"Bearer {self.admin_token}"},
        )
        self.assertEqual(res_admin.status_code, 200)

        # Delete user performs soft delete instead of hard delete
        del_res = asgi_request(
            "DELETE",
            f"/api/admin/users/{self.other_employee.id}",
            headers={"authorization": f"Bearer {self.admin_token}"},
        )
        self.assertEqual(del_res.status_code, 200)
        self.db.expire_all()
        soft_deleted = self.db.query(User).filter(User.id == self.other_employee.id).first()
        self.assertIsNotNone(soft_deleted)
        self.assertTrue(soft_deleted.is_deleted)
        self.assertFalse(soft_deleted.is_active)

    def test_exam_and_quiz_answers_hidden_from_learners_until_graded(self):
        course = Course(
            id=uuid.uuid4(),
            course_code="AI-101",
            title="AI Intro",
            description="Basics",
            difficulty_level="beginner",
            department_id=self.dept_ai.id,
            created_by=self.admin.id,
            status="published",
            is_published=True,
        )
        module = CourseModule(
            id=uuid.uuid4(),
            course_id=course.id,
            title="Module 1",
            sequence_no=1,
            tier="beginner",
        )
        content = ModuleContent(
            id=uuid.uuid4(),
            module_id=module.id,
            content_type="text",
            title="Lesson 1",
            value="Hello",
            sequence_no=1,
            is_active=True,
        )
        quiz = Quiz(id=uuid.uuid4(), module_id=module.id, title="M1 Quiz", passing_score=50, is_published=True)
        qq = QuizQuestion(
            id=uuid.uuid4(),
            quiz_id=quiz.id,
            question_text="2+2?",
            options=["3", "4"],
            correct_answer="4",
            explanation="Basic math",
            points=1,
            question_type="mcq",
        )
        exam = Exam(
            id=uuid.uuid4(),
            title="AI Final",
            course_id=course.id,
            department_id=self.dept_ai.id,
            duration_minutes=30,
            is_published=True,
            status="published",
            created_by=self.admin.id,
        )
        eq = ExamQuestion(
            id=uuid.uuid4(),
            exam_id=exam.id,
            question_text="Capital of India?",
            question_type="mcq",
            options=["Mumbai", "New Delhi"],
            correct_answer="1",
        )
        enr = CourseEnrollment(
            id=uuid.uuid4(),
            user_id=self.employee.id,
            course_id=course.id,
            status="enrolled",
            progress_percent=0,
        )
        self.db.add_all([course, module, content, quiz, qq, exam, eq, enr])
        self.db.commit()

        # Employee fetching exam before grading gets correct_answer=None
        res_exam = asgi_request("GET", f"/api/exams/{exam.id}", headers={"authorization": f"Bearer {self.emp_token}"})
        self.assertEqual(res_exam.status_code, 200)
        self.assertIsNone(res_exam.json()["questions"][0]["correct_answer"])

        # Other-department employee gets 403
        res_other = asgi_request("GET", f"/api/exams/{exam.id}", headers={"authorization": f"Bearer {self.other_emp_token}"})
        self.assertEqual(res_other.status_code, 403)

        # Admin gets correct_answer
        res_adm = asgi_request("GET", f"/api/exams/{exam.id}", headers={"authorization": f"Bearer {self.admin_token}"})
        self.assertEqual(res_adm.status_code, 200)
        self.assertEqual(res_adm.json()["questions"][0]["correct_answer"], "1")

        # Once graded, employee can see correct_answer in review
        sub = ExamSubmission(
            id=uuid.uuid4(),
            exam_id=exam.id,
            user_id=self.employee.id,
            status="graded",
            answers={str(eq.id): "1"},
        )
        self.db.add(sub)
        self.db.commit()
        res_graded = asgi_request("GET", f"/api/exams/{exam.id}", headers={"authorization": f"Bearer {self.emp_token}"})
        self.assertEqual(res_graded.status_code, 200)
        self.assertEqual(res_graded.json()["questions"][0]["correct_answer"], "1")

        # Quiz endpoint strips correct_answer & explanation for employee
        res_quiz = asgi_request("GET", f"/api/quizzes/module/{module.id}", headers={"authorization": f"Bearer {self.emp_token}"})
        self.assertEqual(res_quiz.status_code, 200)
        self.assertEqual(res_quiz.json()["questions"][0]["correct_answer"], "")
        self.assertIsNone(res_quiz.json()["questions"][0]["explanation"])

        # Server-side quiz grading accepts option letter ("B" -> "4")
        attempt_res = asgi_request(
            "POST",
            f"/api/quizzes/{quiz.id}/attempt",
            headers={"authorization": f"Bearer {self.emp_token}"},
            json_body={"quiz_id": str(quiz.id), "answers": {str(qq.id): "B"}},
        )
        self.assertEqual(attempt_res.status_code, 201)
        self.assertEqual(attempt_res.json()["score"], 100.0)
        self.assertTrue(attempt_res.json()["passed"])

    def test_enrollment_progress_bypass_blocked(self):
        course = Course(
            id=uuid.uuid4(),
            course_code="AI-102",
            title="AI Locking",
            description="Basics",
            difficulty_level="beginner",
            department_id=self.dept_ai.id,
            created_by=self.admin.id,
            status="published",
            is_published=True,
        )
        module = CourseModule(id=uuid.uuid4(), course_id=course.id, title="M1", sequence_no=1, tier="beginner")
        c1 = ModuleContent(id=uuid.uuid4(), module_id=module.id, content_type="text", title="L1", value="A", sequence_no=1, is_active=True)
        enr = CourseEnrollment(id=uuid.uuid4(), user_id=self.employee.id, course_id=course.id, status="enrolled", progress_percent=0)
        self.db.add_all([course, module, c1, enr])
        self.db.commit()

        # Cannot force 100% via progress-percent
        pct_res = asgi_request(
            "PUT",
            f"/api/enrollments/{enr.id}/progress-percent",
            headers={"authorization": f"Bearer {self.emp_token}"},
            query={"percent": 100},
        )
        self.assertEqual(pct_res.status_code, 200)
        self.assertEqual(pct_res.json()["progress_percent"], 0)

        # Cannot force complete when content incomplete
        comp_res = asgi_request(
            "POST",
            f"/api/enrollments/{enr.id}/complete",
            headers={"authorization": f"Bearer {self.emp_token}"},
        )
        self.assertEqual(comp_res.status_code, 400)

    def test_upload_sanitization_and_exam_file_protection(self):
        # Reject .svg XSS vector
        body, ctype = multipart_upload("file", "../../evil.svg", "image/svg+xml", b"<svg onload=alert(1)/>")
        res_svg = asgi_request(
            "POST",
            "/api/modules/upload-media",
            headers={"authorization": f"Bearer {self.admin_token}", "content-type": ctype},
            body=body,
        )
        self.assertEqual(res_svg.status_code, 400)

        # Path traversal filename sanitized to safe filename inside UPLOAD_DIR/media
        body2, ctype2 = multipart_upload("file", "../../hello world.png", "image/png", b"\x89PNG\r\n\x1a\n")
        res_png = asgi_request(
            "POST",
            "/api/modules/upload-media",
            headers={"authorization": f"Bearer {self.admin_token}", "content-type": ctype2},
            body=body2,
        )
        self.assertEqual(res_png.status_code, 201)
        data = res_png.json()
        self.assertNotIn("..", data["file_path"])
        self.assertTrue(data["file_path"].startswith("/uploads/media/"))

        # Protected exam submission file cannot be read by another employee
        exam = Exam(
            id=uuid.uuid4(),
            title="Doc Exam",
            department_id=self.dept_ai.id,
            duration_minutes=30,
            is_published=True,
            status="published",
            created_by=self.admin.id,
        )
        sub = ExamSubmission(
            id=uuid.uuid4(),
            exam_id=exam.id,
            user_id=self.employee.id,
            status="in_progress",
            answers={},
        )
        self.db.add_all([exam, sub])
        self.db.commit()

        up_body, up_ctype = multipart_upload("file", "answer.txt", "text/plain", b"my secret answer")
        up_res = asgi_request(
            "POST",
            f"/api/exams/submissions/{sub.id}/upload",
            headers={"authorization": f"Bearer {self.emp_token}", "content-type": up_ctype},
            body=up_body,
        )
        self.assertEqual(up_res.status_code, 200)
        file_url = up_res.json()["file_url"]
        self.assertTrue(file_url.startswith(f"/api/exams/submissions/{sub.id}/files/"))

        # Other employee is denied
        dl_other = asgi_request("GET", file_url, headers={"authorization": f"Bearer {self.other_emp_token}"})
        self.assertEqual(dl_other.status_code, 403)

        # Owner can download
        dl_owner = asgi_request("GET", file_url, headers={"authorization": f"Bearer {self.emp_token}"})
        self.assertEqual(dl_owner.status_code, 200)
        self.assertEqual(dl_owner.body, b"my secret answer")


if __name__ == "__main__":
    unittest.main()
