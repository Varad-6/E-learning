import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
import sqlalchemy as sa
from uuid import UUID
from typing import List, Optional, Dict, Any

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.department import Department
from app.models.course_enrollment import CourseEnrollment
from app.models.exam import Exam, ExamSubmission, ExamGrade

router = APIRouter(prefix="/api/leaderboard", tags=["Leaderboard"])

MIN_EXAMS_DEFAULT = 3


@router.get(
    "",
    summary="Get Leaderboard Rankings (Global, Department, or Per-Exam)"
)
def get_leaderboard(
    scope: str = Query("global", description="Leaderboard scope: global | department | exam"),
    department_id: Optional[UUID] = Query(None, description="Department ID if scope is department"),
    exam_id: Optional[UUID] = Query(None, description="Exam ID if scope is exam"),
    min_exams: int = Query(MIN_EXAMS_DEFAULT, description="Minimum completed exams threshold"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_roles = [r.name for r in current_user.roles]
    is_admin_or_mgr = "SYSTEM_ADMIN" in user_roles or "HR_ADMIN" in user_roles or "COURSE_MANAGER" in user_roles

    if not is_admin_or_mgr:
        # Enforce strict scoping to user's department
        scope = "department"
        department_id = current_user.department_id

    # Fetch lists for dropdown selectors and department summary cards
    if not is_admin_or_mgr:
        departments_list = db.query(Department).filter(Department.id == current_user.department_id).all()
    else:
        departments_list = db.query(Department).all()

    dept_dicts = []
    for d in departments_list:
        # Average exam score in department
        avg_score_query = db.query(func.avg(ExamGrade.overall_score)).join(
            ExamSubmission, ExamGrade.submission_id == ExamSubmission.id
        ).join(
            User, ExamSubmission.user_id == User.id
        ).filter(
            User.department_id == d.id,
            ExamSubmission.status == "graded"
        ).scalar()
        avg_score = round(float(avg_score_query), 2) if avg_score_query is not None else None

        # Top performer in department
        top_perf = db.query(
            User.first_name,
            User.last_name,
            func.avg(ExamGrade.overall_score).label("user_avg")
        ).join(
            ExamSubmission, ExamSubmission.user_id == User.id
        ).join(
            ExamGrade, ExamGrade.submission_id == ExamSubmission.id
        ).filter(
            User.department_id == d.id,
            ExamSubmission.status == "graded"
        ).group_by(
            User.id, User.first_name, User.last_name
        ).order_by(
            func.avg(ExamGrade.overall_score).desc()
        ).first()

        top_performer_name = f"{top_perf[0]} {top_perf[1]}" if top_perf else None
        top_performer_score = round(float(top_perf[2]), 2) if top_perf else None

        # Employee count in department
        headcount = db.query(User).filter(
            User.department_id == d.id,
            User.is_active == True,
            User.is_deleted == False
        ).count()

        dept_dicts.append({
            "id": str(d.id),
            "name": d.name,
            "code": d.code,
            "avg_score": avg_score,
            "top_performer_name": top_performer_name,
            "top_performer_score": top_performer_score,
            "employee_count": headcount
        })

    if not is_admin_or_mgr:
        exams_list = db.query(Exam).filter(
            Exam.is_published == True,
            (Exam.department_id == current_user.department_id) | (Exam.department_id == None)
        ).all()
    else:
        exams_list = db.query(Exam).filter(Exam.is_published == True).all()

    exam_dicts = [{"id": str(e.id), "title": e.title} for e in exams_list]

    rankings = []

    if scope == "exam":
        if not exam_id:
            if exams_list:
                exam_id = exams_list[0].id
            else:
                return {
                    "scope": scope,
                    "exam_id": None,
                    "department_id": None,
                    "min_exams": 1,
                    "current_user_rank": None,
                    "rankings": [],
                    "departments": dept_dicts,
                    "exams": exam_dicts
                }

        # Query all graded submissions for this specific exam
        query_exam = db.query(
            ExamSubmission.user_id,
            ExamGrade.overall_score,
            ExamSubmission.submitted_at,
            ExamSubmission.started_at,
            User.first_name,
            User.last_name,
            User.employee_code,
            Department.name.label("department_name")
        ).join(
            ExamGrade, ExamGrade.submission_id == ExamSubmission.id
        ).join(
            User, ExamSubmission.user_id == User.id
        ).outerjoin(
            Department, User.department_id == Department.id
        ).filter(
            ExamSubmission.exam_id == exam_id,
            ExamSubmission.status == "graded",
            ExamGrade.overall_score.isnot(None)
        )

        if not is_admin_or_mgr:
            query_exam = query_exam.filter(User.department_id == current_user.department_id)

        graded_subs = query_exam.all()

        # Sort by overall_score desc, then submitted_at asc
        sorted_subs = sorted(graded_subs, key=lambda x: (-x.overall_score, x.submitted_at or datetime.datetime.max))

        for idx, row in enumerate(sorted_subs):
            time_taken_str = "N/A"
            if row.submitted_at and row.started_at:
                diff = row.submitted_at - row.started_at
                minutes = int(diff.total_seconds() // 60)
                seconds = int(diff.total_seconds() % 60)
                time_taken_str = f"{minutes}m {seconds}s"
            
            date_str = row.submitted_at.strftime("%Y-%m-%d") if row.submitted_at else "N/A"

            courses_completed = db.query(CourseEnrollment).filter(
                CourseEnrollment.user_id == row.user_id,
                CourseEnrollment.status == "completed"
            ).count()

            rankings.append({
                "rank": idx + 1,
                "user_id": str(row.user_id),
                "user_name": f"{row.first_name} {row.last_name}",
                "employee_code": row.employee_code,
                "department_name": row.department_name or "General",
                "exams_completed": 1,
                "courses_completed": courses_completed,
                "score": round(float(row.overall_score), 2),
                "time_taken": time_taken_str,
                "date": date_str
            })

    else:
        # Scope is either 'global' or 'department'
        # Query aggregated avg score per user
        query = db.query(
            ExamSubmission.user_id,
            func.avg(ExamGrade.overall_score).label("avg_score"),
            func.count(ExamSubmission.id).label("exams_count"),
            User.first_name,
            User.last_name,
            User.employee_code,
            Department.name.label("department_name"),
            User.department_id
        ).join(
            ExamGrade, ExamGrade.submission_id == ExamSubmission.id
        ).join(
            User, ExamSubmission.user_id == User.id
        ).outerjoin(
            Department, User.department_id == Department.id
        ).filter(
            ExamSubmission.status == "graded",
            ExamGrade.overall_score.isnot(None),
            User.is_active == True,
            User.is_deleted == False
        )

        if scope == "department":
            target_dept_id = department_id or current_user.department_id
            if target_dept_id:
                query = query.filter(User.department_id == target_dept_id)

        query = query.group_by(
            ExamSubmission.user_id,
            User.first_name,
            User.last_name,
            User.employee_code,
            Department.name,
            User.department_id
        ).having(
            func.count(ExamSubmission.id) >= min_exams
        )

        rows = query.all()
        sorted_rows = sorted(rows, key=lambda x: -float(x.avg_score))

        for idx, r in enumerate(sorted_rows):
            courses_completed = db.query(CourseEnrollment).filter(
                CourseEnrollment.user_id == r.user_id,
                CourseEnrollment.status == "completed"
            ).count()

            rankings.append({
                "rank": idx + 1,
                "user_id": str(r.user_id),
                "user_name": f"{r.first_name} {r.last_name}",
                "employee_code": r.employee_code,
                "department_name": r.department_name or "General",
                "exams_completed": r.exams_count,
                "courses_completed": courses_completed,
                "score": round(float(r.avg_score), 2)
            })

    # Compute current user rank
    current_user_rank = None
    user_entry = next((r for r in rankings if str(r["user_id"]) == str(current_user.id)), None)
    if user_entry:
        current_user_rank = {
            "rank": user_entry["rank"],
            "total_participants": len(rankings),
            "score": user_entry["score"],
            "exams_completed": user_entry["exams_completed"],
            "courses_completed": user_entry["courses_completed"],
            "department_name": user_entry["department_name"]
        }
    else:
        # Check current user's graded exams count if below threshold
        emp_graded_count = db.query(ExamSubmission).filter(
            ExamSubmission.user_id == current_user.id,
            ExamSubmission.status == "graded"
        ).count()
        courses_completed = db.query(CourseEnrollment).filter(
            CourseEnrollment.user_id == current_user.id,
            CourseEnrollment.status == "completed"
        ).count()
        current_user_rank = {
            "rank": None,
            "total_participants": len(rankings),
            "score": None,
            "exams_completed": emp_graded_count,
            "courses_completed": courses_completed,
            "min_required": min_exams if scope != "exam" else 1,
            "department_name": current_user.department.name if current_user.department else "General"
        }

    return {
        "scope": scope,
        "department_id": str(department_id) if department_id else (str(current_user.department_id) if current_user.department_id else None),
        "exam_id": str(exam_id) if exam_id else None,
        "min_exams": min_exams if scope != "exam" else 1,
        "current_user_rank": current_user_rank,
        "rankings": rankings,
        "departments": dept_dicts,
        "exams": exam_dicts
    }
