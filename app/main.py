from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.exceptions import RequestValidationError
import logging

from app.api.auth import router as auth_router
from app.api.course import router as course_router
from app.api.enrollment import router as enrollment_router
from app.api.quiz import router as quiz_router
from app.api.department import router as department_router
from app.api.admin import router as admin_router
from app.api.module import router as module_router
from app.api.exam import router as exam_router
from app.api.audit import router as audit_router
from app.api.badge import router as badge_router
from app.api.notification import router as notification_router
from app.api.reporting import router as reporting_router
from app.api.leaderboard import router as leaderboard_router
from app.api.dashboard import router as dashboard_router
from fastapi.staticfiles import StaticFiles
import os

# Configure basic logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("app.main")

app = FastAPI(
    title="Enterprise LMS API",
    description=(
        "Production-grade backend core services, course management, enrollments, "
        "quizzes, departments, and user administration for the Enterprise Learning Management System (LMS)."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Enable CORS for frontend flexibility across origins and dev servers
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(auth_router)
app.include_router(course_router)
app.include_router(enrollment_router)
app.include_router(quiz_router)
app.include_router(department_router)
app.include_router(admin_router)
app.include_router(module_router)
app.include_router(exam_router)
app.include_router(audit_router)
app.include_router(badge_router)
app.include_router(notification_router)
app.include_router(reporting_router)
app.include_router(leaderboard_router)
app.include_router(dashboard_router)

# Mount static uploads folder for descriptive exam file submissions
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")



# Exception Handlers
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Ensure HTTP exceptions are returned with standard detail format."""
    logger.error(f"HTTP error on {request.url.path}: {exc.detail} (status: {exc.status_code})")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Ensure Pydantic validation errors return structured details."""
    logger.error(f"Validation error on {request.url.path}: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all handler for unhandled server-side exceptions."""
    logger.critical(f"Unhandled system exception on {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected server error occurred. Please try again later."},
    )

@app.get("/", tags=["Health Check"])
def health_check():
    """Simple root health check endpoint."""
    return {
        "status": "healthy",
        "service": "Enterprise LMS Authentication API",
        "documentation": "/docs"
    }
