from app.database.base import Base
from app.models.user import User
from app.models.role import Role
from app.models.user_role import UserRole
from app.models.otp import PasswordResetOTP
from app.models.refresh_token import RefreshToken
from app.models.department import Department
from app.models.course import Course
from app.models.course_module import CourseModule
from app.models.module_content import ModuleContent
from app.models.course_enrollment import CourseEnrollment
from app.models.user_course_progress import UserCourseProgress
from app.models.quiz import Quiz
from app.models.quiz_question import QuizQuestion
from app.models.quiz_attempt import QuizAttempt
from app.models.course_approval import CourseApproval

__all__ = [
    "Base",
    "User",
    "Role",
    "UserRole",
    "PasswordResetOTP",
    "RefreshToken",
    "Department",
    "Course",
    "CourseModule",
    "ModuleContent",
    "CourseEnrollment",
    "UserCourseProgress",
    "Quiz",
    "QuizQuestion",
    "QuizAttempt",
    "CourseApproval",
]
