import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
import sqlalchemy as sa
from uuid import UUID
from typing import List, Optional, Dict, Any

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.role import Role
from app.models.user_role import UserRole
from app.models.department import Department
from app.models.exam import Exam, ExamSubmission, ExamGrade

router = APIRouter(prefix="/api/leaderboard", tags=["Leaderboard"])

MIN_EXAMS_DEFAULT = 1


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
    is_admin_or_hr = "SYSTEM_ADMIN" in user_roles or "HR_ADMIN" in user_roles or bool(current_user.department and current_user.department.code in ["HR", "HR_ADMIN"])
    is_manager = "COURSE_MANAGER" in user_roles and not is_admin_or_hr
    is_employee_only = "EMPLOYEE" in user_roles and not (is_admin_or_hr or is_manager)

    if is_employee_only or is_manager:
        if scope != "exam":
            scope = "department"
        department_id = current_user.department_id

    # Fetch lists for dropdown selectors and department summary cards
    if is_manager:
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
        ).join(
            UserRole, User.id == UserRole.user_id
        ).join(
            Role, UserRole.role_id == Role.id
        ).filter(
            User.department_id == d.id,
            ExamSubmission.status == "graded",
            Role.name == "EMPLOYEE"
        ).group_by(
            User.id, User.first_name, User.last_name
        ).order_by(
            func.avg(ExamGrade.overall_score).desc()
        ).first()

        top_performer_name = f"{top_perf[0]} {top_perf[1]}" if top_perf else None
        top_performer_score = round(float(top_perf[2]), 2) if top_perf else None

        # Employee count in department
        headcount = db.query(User).join(
            UserRole, User.id == UserRole.user_id
        ).join(
            Role, UserRole.role_id == Role.id
        ).filter(
            User.department_id == d.id,
            User.is_active == True,
            User.is_deleted == False,
            Role.name == "EMPLOYEE"
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

    # Standalone exams should show up too.
    exams_query = db.query(Exam).filter(Exam.is_published == True)
    if is_manager:
        exams_query = exams_query.filter(Exam.department_id == current_user.department_id)
    exams_list = exams_query.all()
    exam_dicts = [{"id": str(e.id), "title": e.title} for e in exams_list]

    rankings = []
    thirty_days_ago = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=30)

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
            ExamSubmission.started_at,
            User.first_name,
            User.last_name,
            User.employee_code,
            Department.name.label("department_name")
        ).join(
            ExamGrade, ExamGrade.submission_id == ExamSubmission.id
        ).join(
            User, ExamSubmission.user_id == User.id
        ).join(
            UserRole, User.id == UserRole.user_id
        ).join(
            Role, UserRole.role_id == Role.id
        ).outerjoin(
            Department, User.department_id == Department.id
        ).filter(
            ExamSubmission.exam_id == exam_id,
            ExamSubmission.status == "graded",
            ExamGrade.overall_score.isnot(None),
            Role.name == "EMPLOYEE"
        ).all()

        # Sort by overall_score desc, then submitted_at asc
        sorted_subs = sorted(graded_subs, key=lambda x: (-x.overall_score, x.submitted_at or datetime.datetime.max))

        # Query historical data (before 30 days ago) for delta
        prev_graded_subs = db.query(
            ExamSubmission.user_id,
            ExamGrade.overall_score,
            ExamSubmission.submitted_at
        ).join(
            ExamGrade, ExamGrade.submission_id == ExamSubmission.id
        ).join(
            User, ExamSubmission.user_id == User.id
        ).join(
            UserRole, User.id == UserRole.user_id
        ).join(
            Role, UserRole.role_id == Role.id
        ).filter(
            ExamSubmission.exam_id == exam_id,
            ExamSubmission.status == "graded",
            ExamGrade.overall_score.isnot(None),
            ExamSubmission.submitted_at < thirty_days_ago,
            Role.name == "EMPLOYEE"
        ).all()
        sorted_prev = sorted(prev_graded_subs, key=lambda x: (-x.overall_score, x.submitted_at or datetime.datetime.max))
        prev_ranks = {str(row.user_id): idx + 1 for idx, row in enumerate(sorted_prev)}

        for idx, row in enumerate(sorted_subs):
            time_taken_str = "N/A"
            if row.submitted_at and row.started_at:
                diff = row.submitted_at - row.started_at
                minutes = int(diff.total_seconds() // 60)
                seconds = int(diff.total_seconds() % 60)
                time_taken_str = f"{minutes}m {seconds}s"
            
            date_str = row.submitted_at.strftime("%Y-%m-%d") if row.submitted_at else "N/A"
            
            curr_rank = idx + 1
            prev_rank = prev_ranks.get(str(row.user_id))
            if prev_rank is not None:
                delta = prev_rank - curr_rank
            else:
                delta = "New"

            # Query user's highest active badge tier
            from app.models.user_badge import UserBadge
            from app.models.badge_tier import BadgeTier
            highest_badge = db.query(UserBadge).join(
                BadgeTier, UserBadge.badge_tier_id == BadgeTier.id
            ).filter(
                UserBadge.user_id == row.user_id
            ).order_by(
                BadgeTier.tier_order.desc()
            ).first()
            badge_name = highest_badge.badge_tier.name if highest_badge else None
            badge_asset_ref = highest_badge.badge_tier.icon_asset_ref if highest_badge else None

            rankings.append({
                "rank": curr_rank,
                "user_id": str(row.user_id),
                "user_name": f"{row.first_name} {row.last_name}",
                "employee_code": row.employee_code,
                "department_name": row.department_name or "General",
                "exams_completed": 1,
                "score": round(float(row.overall_score), 2),
                "time_taken": time_taken_str,
                "date": date_str,
                "delta": delta,
                "badge_name": badge_name,
                "badge_asset_ref": badge_asset_ref
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
        ).join(
            UserRole, User.id == UserRole.user_id
        ).join(
            Role, UserRole.role_id == Role.id
        ).outerjoin(
            Department, User.department_id == Department.id
        ).filter(
            ExamSubmission.status == "graded",
            ExamGrade.overall_score.isnot(None),
            User.is_active == True,
            User.is_deleted == False,
            Role.name == "EMPLOYEE"
        )

        target_dept_id = department_id
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
        # Sort by score DESC, then first_name ASC, last_name ASC
        sorted_rows = sorted(rows, key=lambda x: (-float(x.avg_score), (x.first_name or '').lower(), (x.last_name or '').lower()))

        # Query historical data (before 30 days ago) for delta
        prev_query = db.query(
            ExamSubmission.user_id,
            func.avg(ExamGrade.overall_score).label("avg_score")
        ).join(
            ExamGrade, ExamGrade.submission_id == ExamSubmission.id
        ).join(
            User, ExamSubmission.user_id == User.id
        ).join(
            UserRole, User.id == UserRole.user_id
        ).join(
            Role, UserRole.role_id == Role.id
        ).filter(
            ExamSubmission.status == "graded",
            ExamGrade.overall_score.isnot(None),
            User.is_active == True,
            User.is_deleted == False,
            ExamSubmission.submitted_at < thirty_days_ago,
            Role.name == "EMPLOYEE"
        )
        if scope == "department" and target_dept_id:
            prev_query = prev_query.filter(User.department_id == target_dept_id)
            
        prev_rows = prev_query.group_by(
            ExamSubmission.user_id
        ).all()
        
        sorted_prev = sorted(prev_rows, key=lambda x: -float(x.avg_score))
        prev_ranks = {str(row.user_id): idx + 1 for idx, row in enumerate(sorted_prev)}

        already_ranked_ids = set()

        for idx, r in enumerate(sorted_rows):
            already_ranked_ids.add(str(r.user_id))
            curr_rank = idx + 1
            prev_rank = prev_ranks.get(str(r.user_id))
            if prev_rank is not None:
                delta = prev_rank - curr_rank
            else:
                delta = "New"

            # Query user's highest active badge tier
            from app.models.user_badge import UserBadge
            from app.models.badge_tier import BadgeTier
            highest_badge = db.query(UserBadge).join(
                BadgeTier, UserBadge.badge_tier_id == BadgeTier.id
            ).filter(
                UserBadge.user_id == r.user_id
            ).order_by(
                BadgeTier.tier_order.desc()
            ).first()
            badge_name = highest_badge.badge_tier.name if highest_badge else None
            badge_asset_ref = highest_badge.badge_tier.icon_asset_ref if highest_badge else None

            rankings.append({
                "rank": curr_rank,
                "user_id": str(r.user_id),
                "user_name": f"{r.first_name} {r.last_name}",
                "employee_code": r.employee_code,
                "department_name": r.department_name or "General",
                "exams_completed": r.exams_count,
                "score": round(float(r.avg_score), 2),
                "delta": delta,
                "badge_name": badge_name,
                "badge_asset_ref": badge_asset_ref
            })

        # Also append 0-score / unattempted employees for department scope
        if scope == "department" and target_dept_id:
            dept_users = db.query(User).join(
                UserRole, User.id == UserRole.user_id
            ).join(
                Role, UserRole.role_id == Role.id
            ).outerjoin(
                Department, User.department_id == Department.id
            ).filter(
                User.department_id == target_dept_id,
                User.is_active == True,
                User.is_deleted == False,
                Role.name == "EMPLOYEE"
            ).all()

            unranked_users = [u for u in dept_users if str(u.id) not in already_ranked_ids]
            unranked_users.sort(key=lambda u: ((u.first_name or '').lower(), (u.last_name or '').lower()))

            current_next_rank = len(rankings) + 1
            for u in unranked_users:
                # Query actual exams completed and average score for this user
                user_stats = db.query(
                    func.avg(ExamGrade.overall_score).label("avg_score"),
                    func.count(ExamSubmission.id).label("exams_count")
                ).join(
                    ExamGrade, ExamGrade.submission_id == ExamSubmission.id
                ).filter(
                    ExamSubmission.user_id == u.id,
                    ExamSubmission.status == "graded",
                    ExamGrade.overall_score.isnot(None)
                ).first()

                exams_count = user_stats[1] if user_stats and user_stats[1] is not None else 0
                avg_score = round(float(user_stats[0]), 2) if user_stats and user_stats[0] is not None else 0.0

                # Query user's highest active badge tier
                from app.models.user_badge import UserBadge
                from app.models.badge_tier import BadgeTier
                highest_badge = db.query(UserBadge).join(
                    BadgeTier, UserBadge.badge_tier_id == BadgeTier.id
                ).filter(
                    UserBadge.user_id == u.id
                ).order_by(
                    BadgeTier.tier_order.desc()
                ).first()
                badge_name = highest_badge.badge_tier.name if highest_badge else None
                badge_asset_ref = highest_badge.badge_tier.icon_asset_ref if highest_badge else None

                rankings.append({
                    "rank": current_next_rank,
                    "user_id": str(u.id),
                    "user_name": f"{u.first_name} {u.last_name}",
                    "employee_code": u.employee_code,
                    "department_name": u.department.name if u.department else "General",
                    "exams_completed": exams_count,
                    "score": avg_score,
                    "delta": "New",
                    "badge_name": badge_name,
                    "badge_asset_ref": badge_asset_ref
                })
                current_next_rank += 1

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
        "department_id": str(department_id) if department_id else (str(current_user.department_id) if current_user.department_id else None),
        "exam_id": str(exam_id) if exam_id else None,
        "min_exams": min_exams if scope != "exam" else 1,
        "current_user_rank": current_user_rank,
        "rankings": rankings,
        "departments": dept_dicts,
        "exams": exam_dicts
    }
