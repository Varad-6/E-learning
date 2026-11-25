import logging
import os
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.admin import router as admin_router
from app.api.audit import router as audit_router
from app.api.auth import router as auth_router
from app.api.badge import router as badge_router, users_router as badge_users_router
from app.api.course import root_router as course_root_router, router as course_router
from app.api.dashboard import router as dashboard_router
from app.api.department import router as department_router
from app.api.employee_dashboard import router as employee_dashboard_router
from app.api.enrollment import router as enrollment_router
from app.api.exam import router as exam_router
from app.api.leaderboard import router as leaderboard_router
from app.api.module import router as module_router
from app.api.notification import router as notification_router
from app.api.quiz import router as quiz_router
from app.api.reporting import router as reporting_router
from app.api.sync import router as sync_router
from app.api.user_management import router as user_management_router
from app.core.config import settings
from app.database.session import SessionLocal
from app.services.live_sync_service import LiveSyncService

# Validate critical production secrets before accepting traffic
settings.validate_production_security()

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
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
)


@app.get("/health", tags=["Health"])
def health_check():
    """Verify service and database connectivity."""
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "service": "Kaizen LMS Core", "database": "connected"}
    except Exception as exc:
        logger.error(f"Health check DB failure: {exc}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "unhealthy", "service": "Kaizen LMS Core", "database": "unreachable"},
        )
    finally:
        db.close()


allowed_origins = settings.allowed_origins_list

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
)

# Register routes
app.include_router(auth_router)
app.include_router(course_root_router)
app.include_router(course_router)
app.include_router(enrollment_router)
app.include_router(quiz_router)
app.include_router(department_router)
app.include_router(admin_router)
app.include_router(module_router)
app.include_router(exam_router)
app.include_router(audit_router)
app.include_router(badge_router)
app.include_router(badge_users_router)
app.include_router(notification_router)
app.include_router(reporting_router)
app.include_router(leaderboard_router)
app.include_router(dashboard_router)
app.include_router(employee_dashboard_router)
app.include_router(user_management_router)
app.include_router(sync_router)

_SYNC_SKIP_PREFIXES = (
    "/api/auth/login",
    "/api/auth/refresh",
    "/api/auth/logout",
    "/api/sync",
)


@app.middleware("http")
async def security_and_sync_middleware(request: Request, call_next):
    """Apply baseline HTTP security headers and broadcast live sync events on successful mutations."""
    response = await call_next(request)

    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    if settings.is_production:
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

    if request.method in ("POST", "PUT", "PATCH", "DELETE") and response.status_code < 400:
        path = request.url.path
        if not path.startswith(_SYNC_SKIP_PREFIXES) and "/notifications/" not in path:
            LiveSyncService.publish_change(LiveSyncService.classify_topic(path))
    return response


# Mount ONLY course media and module content folders publicly (never exam_submissions)
_courses_upload_dir = os.path.join(settings.UPLOAD_DIR, "courses")
_media_upload_dir = os.path.join(settings.UPLOAD_DIR, "media")
for _d in (_courses_upload_dir, _media_upload_dir):
    try:
        os.makedirs(_d, exist_ok=True)
    except OSError:
        pass
app.mount("/uploads/courses", StaticFiles(directory=_courses_upload_dir, check_dir=False), name="uploads_courses")
app.mount("/uploads/media", StaticFiles(directory=_media_upload_dir, check_dir=False), name="uploads_media")


def _cors_headers_for_request(request: Request) -> dict:
    """Return CORS headers strictly matching configured origins for exception responses."""
    origin = (request.headers.get("origin") or "").rstrip("/")
    if origin and origin in allowed_origins:
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Vary": "Origin",
        }
    return {}


# NOTE: FastAPI exception handlers run outside CORSMiddleware, so allowed-origin headers are added here.
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Ensure HTTP exceptions are returned with standard detail format and validated CORS headers."""
    logger.warning(f"HTTP error on {request.url.path}: {exc.detail} (status: {exc.status_code})")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=_cors_headers_for_request(request),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Ensure Pydantic validation errors return structured details with validated CORS headers."""
    logger.warning(f"Validation error on {request.url.path}: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
        headers=_cors_headers_for_request(request),
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all handler for unhandled server-side exceptions."""
    logger.critical(f"Unhandled system exception on {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected server error occurred. Please try again later."},
        headers=_cors_headers_for_request(request),
    )


@app.get("/", tags=["Health Check"])
def root_status():
    """Simple root status endpoint."""
    payload = {
        "status": "healthy",
        "service": "Enterprise LMS API",
    }
    if not settings.is_production:
        payload["documentation"] = "/docs"
    return payload
