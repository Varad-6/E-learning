from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard Analytics"])

@router.get(
    "/summary",
    summary="Get Overview Summary Counts & System Health Status"
)
def get_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return DashboardService.get_summary(db)

@router.get(
    "/completion-rate",
    summary="Get Course Completion Rate Distribution"
)
def get_completion_rate(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return DashboardService.get_completion_rate(db)

@router.get(
    "/enrollment-trend",
    summary="Get Time-series Enrollment Trend"
)
def get_enrollment_trend(
    range_days: int = Query(180, description="Range in days for enrollment trend aggregation"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return DashboardService.get_enrollment_trend(db, range_days=range_days)

@router.get(
    "/department-performance",
    summary="Get Department Average Scores & Completion Rates"
)
def get_department_performance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return DashboardService.get_department_performance(db)

@router.get(
    "/active-inactive-learners",
    summary="Get Active vs Inactive Learner Counts"
)
def get_active_inactive_learners(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return DashboardService.get_active_inactive_learners(db)

@router.get(
    "/top-courses",
    summary="Get Top Ranked Courses by Enrollment Headcount"
)
def get_top_courses(
    limit: int = Query(5, description="Number of top courses to retrieve"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return DashboardService.get_top_courses(db, limit=limit)

@router.get(
    "/exam-pass-fail",
    summary="Get Overall Exam Pass/Fail Ratio"
)
def get_exam_pass_fail(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return DashboardService.get_exam_pass_fail(db)

@router.get(
    "/pending-approvals",
    summary="Get Pending Course Approvals & Exam Reviews Count"
)
def get_pending_approvals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return DashboardService.get_pending_approvals(db)

@router.get(
    "/top-performers",
    summary="Get Top Performing Learners by Average Exam Score"
)
def get_top_performers(
    limit: int = Query(5, description="Number of top performers to retrieve"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return DashboardService.get_top_performers(db, limit=limit)
