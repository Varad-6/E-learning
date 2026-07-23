from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard Analytics"])

def get_manager_dept_id(current_user: User) -> Optional[Any]:
    user_roles = [r.name for r in current_user.roles]
    if "SYSTEM_ADMIN" in user_roles or "HR_ADMIN" in user_roles:
        return None
    if current_user.department and current_user.department.code in ["HR", "HR_ADMIN"]:
        return None
    if "COURSE_MANAGER" in user_roles:
        return current_user.department_id
    return None

@router.get(
    "/summary",
    summary="Get Overview Summary Counts & System Health Status"
)
def get_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dept_id = get_manager_dept_id(current_user)
    return DashboardService.get_summary(db, manager_dept_id=dept_id)

@router.get(
    "/completion-rate",
    summary="Get Course Completion Rate Distribution"
)
def get_completion_rate(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dept_id = get_manager_dept_id(current_user)
    return DashboardService.get_completion_rate(db, manager_dept_id=dept_id)

@router.get(
    "/enrollment-trend",
    summary="Get Time-series Enrollment Trend"
)
def get_enrollment_trend(
    range: Optional[str] = Query(None, description="Range parameter, e.g. 30d, 90d"),
    range_days: int = Query(180, description="Range in days for enrollment trend aggregation"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dept_id = get_manager_dept_id(current_user)
    days = range_days
    if range == "30d":
        days = 30
    elif range == "90d":
        days = 90
    return DashboardService.get_enrollment_trend(db, range_days=days, manager_dept_id=dept_id)

@router.get(
    "/avg-score-per-course",
    summary="Get Average Score per Course"
)
def get_avg_score_per_course(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dept_id = get_manager_dept_id(current_user)
    return DashboardService.get_avg_score_per_course(db, manager_dept_id=dept_id)

@router.get(
    "/department-performance",
    summary="Get Department Average Scores & Completion Rates"
)
def get_department_performance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dept_id = get_manager_dept_id(current_user)
    return DashboardService.get_department_performance(db, manager_dept_id=dept_id)

@router.get(
    "/active-inactive-learners",
    summary="Get Active vs Inactive Learner Counts"
)
def get_active_inactive_learners(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dept_id = get_manager_dept_id(current_user)
    return DashboardService.get_active_inactive_learners(db, manager_dept_id=dept_id)

@router.get(
    "/top-courses",
    summary="Get Top Ranked Courses by Enrollment Headcount"
)
def get_top_courses(
    limit: int = Query(5, description="Number of top courses to retrieve"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dept_id = get_manager_dept_id(current_user)
    return DashboardService.get_top_courses(db, limit=limit, manager_dept_id=dept_id)

@router.get(
    "/exam-pass-fail",
    summary="Get Overall Exam Pass/Fail Ratio"
)
def get_exam_pass_fail(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dept_id = get_manager_dept_id(current_user)
    return DashboardService.get_exam_pass_fail(db, manager_dept_id=dept_id)

@router.get(
    "/pending-approvals",
    summary="Get Pending Course Approvals & Exam Reviews Count"
)
def get_pending_approvals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dept_id = get_manager_dept_id(current_user)
    return DashboardService.get_pending_approvals(db, manager_dept_id=dept_id)

@router.get(
    "/top-performers",
    summary="Get Top Performing Learners by Average Exam Score"
)
def get_top_performers(
    scope: Optional[str] = Query(None, description="Scope filter, e.g. department"),
    limit: int = Query(5, description="Number of top performers to retrieve"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dept_id = get_manager_dept_id(current_user)
    actual_limit = 3 if (scope == "department" or dept_id is not None) else limit
    return DashboardService.get_top_performers(db, limit=actual_limit, manager_dept_id=dept_id)
