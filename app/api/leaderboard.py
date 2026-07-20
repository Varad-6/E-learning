from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from uuid import UUID
from typing import List, Optional, Dict, Any

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.department import Department
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
    # Fetch lists for dropdown selectors
    departments_list = db.query(Department).all()
    dept_dicts = [{"id": d.id, "name": d.name, "code": d.code} for d in departments_list]

    exams_list = db.query(Exam).filter(Exam.is_published == True).all()
    exam_dicts = [{"id": e.id, "title": e.title} for e.find in exams_list] if hasattr(exams_list, 'find') else [{"id": e.id, "title": e.title} for e in exams_list]

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
        graded_subs = db.query(
            ExamSubmission.user_id,
            ExamGrade.overall_score,
            ExamSubmission.submitted_at,
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
        ).all()

        # Sort by overall_score desc, then submitted_at asc
        sorted_subs = sorted(graded_subs, key=lambda x: (-x.overall_score, x.submitted_at or datetime.datetime.max))

        for idx, row in enumerate(sorted_subs):
            rankings.append({
                "rank": idx + 1,
                "user_id": row.user_id,
                "user_name": f"{row.first_name} {row.last_name}",
                "employee_code": row.employee_code,
                "department_name": row.department_name or "General",
                "exams_completed": 1,
                "score": round(float(row.overall_score), 2)
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
            rankings.append({
                "rank": idx + 1,
                "user_id": r.user_id,
                "user_name": f"{r.first_name} {r.last_name}",
                "employee_code": r.employee_code,
                "department_name": r.department_name or "General",
                "exams_completed": r.exams_count,
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
            "department_name": user_entry["department_name"]
        }
    else:
        # Check current user's graded exams count if below threshold
        emp_graded_count = db.query(ExamSubmission).filter(
            ExamSubmission.user_id == current_user.id,
            ExamSubmission.status == "graded"
        ).count()
        current_user_rank = {
            "rank": None,
            "total_participants": len(rankings),
            "score": None,
            "exams_completed": emp_graded_count,
            "min_required": min_exams if scope != "exam" else 1,
            "department_name": current_user.department.name if current_user.department else "General"
        }

    return {
        "scope": scope,
        "department_id": department_id or current_user.department_id,
        "exam_id": exam_id,
        "min_exams": min_exams if scope != "exam" else 1,
        "current_user_rank": current_user_rank,
        "rankings": rankings,
        "departments": dept_dicts,
        "exams": exam_dicts
    }
