from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    VerifyOTPRequest,
    ResetPasswordRequest,
    RefreshTokenRequest,
    RefreshTokenResponse,
    MessageResponse,
)
from app.schemas.user import RoleResponse, UserResponse
from app.schemas.course import (
    CourseCreate,
    CourseUpdate,
    CourseResponse,
    CourseListResponse,
    CourseModuleCreate,
    CourseModuleResponse,
    ModuleContentCreate,
    ModuleContentResponse,
    CourseStatus,
    ModuleCreate,
    ModuleUpdate,
    ModuleResponse,
    ModuleListResponse,
    ModuleContentUpdate,
)
from app.schemas.enrollment import (
    EnrollmentCreate,
    EnrollmentResponse,
    EnrollmentStatus,
    ProgressUpdate,
    UserProgressResponse,
)
from app.schemas.quiz import (
    QuizCreate,
    QuizResponse,
    QuizQuestionCreate,
    QuizQuestionResponse,
    QuizAttemptCreate,
    QuizAttemptResponse,
    QuizResult,
)
from app.schemas.department import (
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentResponse,
)
from app.schemas.admin import (
    UserCreate,
    UserUpdate,
    UserListResponse,
    RoleAssignmentRequest,
)

__all__ = [
    # Auth
    "LoginRequest",
    "LoginResponse",
    "ChangePasswordRequest",
    "ForgotPasswordRequest",
    "VerifyOTPRequest",
    "ResetPasswordRequest",
    "RefreshTokenRequest",
    "RefreshTokenResponse",
    "MessageResponse",
    # User
    "RoleResponse",
    "UserResponse",
    # Course
    "CourseCreate",
    "CourseUpdate",
    "CourseResponse",
    "CourseListResponse",
    "CourseModuleCreate",
    "CourseModuleResponse",
    "ModuleContentCreate",
    "ModuleContentResponse",
    "CourseStatus",
    "ModuleCreate",
    "ModuleUpdate",
    "ModuleResponse",
    "ModuleListResponse",
    "ModuleContentUpdate",

    # Enrollment
    "EnrollmentCreate",
    "EnrollmentResponse",
    "EnrollmentStatus",
    "ProgressUpdate",
    "UserProgressResponse",
    # Quiz
    "QuizCreate",
    "QuizResponse",
    "QuizQuestionCreate",
    "QuizQuestionResponse",
    "QuizAttemptCreate",
    "QuizAttemptResponse",
    "QuizResult",
    # Department
    "DepartmentCreate",
    "DepartmentUpdate",
    "DepartmentResponse",
    # Admin
    "UserCreate",
    "UserUpdate",
    "UserListResponse",
    "RoleAssignmentRequest",
]
