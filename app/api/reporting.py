from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from uuid import UUID
from typing import List, Optional, Dict, Any
import datetime

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.department import Department
from app.models.role import Role
from app.models.user_role import UserRole
from app.models.course_enrollment import CourseEnrollment
from app.models.exam import Exam, ExamSubmission, ExamGrade

router = APIRouter(prefix="/api/reporting", tags=["Reporting"])


@router.get(
    "/departments",
    summary="Level 1: Get Department Cards Summary Stats"
)
def get_departments_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_roles = [r.name for r in current_user.roles]
    if "SYSTEM_ADMIN" not in user_roles and "COURSE_MANAGER" not in user_roles:
        raise HTTPException(status_code=403, detail="Only Admins and Managers can access reporting.")

    # Scoping: Admin sees all departments; Manager sees their own department
    query = db.query(Department)
    if "SYSTEM_ADMIN" not in user_roles:
        if not current_user.department_id:
            return []
        query = query.filter(Department.id == current_user.department_id)

    departments = query.all()
    results = []

    for dept in departments:
        # 1. Employee count in department
        emp_count = db.query(User).filter(
            User.department_id == dept.id,
            User.is_active == True,
            User.is_deleted == False
        ).count()

        # 2. Average exam score for employees in this department (out of 10)
        avg_score_query = db.query(func.avg(ExamGrade.overall_score)).join(
            ExamSubmission, ExamGrade.submission_id == ExamSubmission.id
        ).join(
            User, ExamSubmission.user_id == User.id
        ).filter(
            User.department_id == dept.id,
            ExamSubmission.status == "graded"
        ).scalar()

        avg_score = round(float(avg_score_query), 1) if avg_score_query is not None else None

        # 3. Courses in-progress vs completed count in this department
        in_progress_count = db.query(CourseEnrollment).join(
            User, CourseEnrollment.user_id == User.id
        ).filter(
            User.department_id == dept.id,
            CourseEnrollment.status == "in_progress"
        ).count()

        completed_count = db.query(CourseEnrollment).join(
            User, CourseEnrollment.user_id == User.id
        ).filter(
            User.department_id == dept.id,
            CourseEnrollment.status == "completed"
        ).count()

        # 4. Pending exam reviews count for this department
        pending_reviews_count = db.query(ExamSubmission).join(
            User, ExamSubmission.user_id == User.id
        ).filter(
            User.department_id == dept.id,
            ExamSubmission.status == "submitted"
        ).count()

        results.append({
            "id": dept.id,
            "name": dept.name,
            "code": dept.code,
            "description": dept.description,
            "employee_count": emp_count,
            "avg_exam_score": avg_score,
            "courses_in_progress_count": in_progress_count,
            "courses_completed_count": completed_count,
            "pending_reviews_count": pending_reviews_count
        })

    return results


@router.get(
    "/departments/{department_id}/employees",
    summary="Level 2: Get Employee List inside a Department"
)
def get_department_employees(
    department_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_roles = [r.name for r in current_user.roles]
    if "SYSTEM_ADMIN" not in user_roles and "COURSE_MANAGER" not in user_roles:
        raise HTTPException(status_code=403, detail="Unauthorized access to reporting.")

    # Scoping check: Manager can only view their own department
    if "SYSTEM_ADMIN" not in user_roles and current_user.department_id != department_id:
        raise HTTPException(status_code=403, detail="Managers can only view employee reporting for their assigned department.")

    dept = db.query(Department).filter(Department.id == department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    employees = db.query(User).filter(
        User.department_id == department_id,
        User.is_active == True,
        User.is_deleted == False
    ).all()

    emp_list = []
    for emp in employees:
        emp_roles = [r.name for r in emp.roles]
        role_display = emp_roles[0] if emp_roles else "EMPLOYEE"

        enrolled_count = db.query(CourseEnrollment).filter(CourseEnrollment.user_id == emp.id).count()
        completed_count = db.query(CourseEnrollment).filter(
            CourseEnrollment.user_id == emp.id,
            CourseEnrollment.status == "completed"
        ).count()

        # Exam stats
        graded_subs = db.query(ExamSubmission).filter(
            ExamSubmission.user_id == emp.id,
            ExamSubmission.status == "graded"
        ).all()

        exams_taken_count = len(graded_subs)
        if graded_subs:
            scores = [s.grade.overall_score for s in graded_subs if s.grade and s.grade.overall_score is not None]
            avg_score = round(sum(scores) / len(scores), 1) if scores else None
        else:
            avg_score = None

        # Last activity date
        last_submission = db.query(ExamSubmission).filter(
            ExamSubmission.user_id == emp.id
        ).order_by(ExamSubmission.started_at.desc()).first()

        last_enrollment = db.query(CourseEnrollment).filter(
            CourseEnrollment.user_id == emp.id
        ).order_by(CourseEnrollment.enrolled_at.desc()).first()

        dates = []
        if last_submission and last_submission.submitted_at:
            dates.append(last_submission.submitted_at)
        if last_enrollment:
            if last_enrollment.enrolled_at:
                dates.append(last_enrollment.enrolled_at)
            if last_enrollment.completed_at:
                dates.append(last_enrollment.completed_at)
        if emp.created_at:
            dates.append(emp.created_at)

        last_activity = max(dates).isoformat() if dates else None

        emp_list.append({
            "id": emp.id,
            "employee_code": emp.employee_code,
            "first_name": emp.first_name,
            "last_name": emp.last_name,
            "email": emp.email,
            "role_name": role_display,
            "courses_enrolled_count": enrolled_count,
            "courses_completed_count": completed_count,
            "avg_exam_score": avg_score,
            "exams_taken_count": exams_taken_count,
            "last_activity_date": last_activity
        })

    return {
        "department_name": dept.name,
        "department_code": dept.code,
        "employees": emp_list
    }


@router.get(
    "/employees/{user_id}/detail",
    summary="Level 3: Individual Employee Full Profile & Exam Score Trend"
)
def get_employee_detail_profile(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_roles = [r.name for r in current_user.roles]

    # Scoping check
    if current_user.id != user_id and "SYSTEM_ADMIN" not in user_roles and "COURSE_MANAGER" not in user_roles:
        raise HTTPException(status_code=403, detail="Unauthorized access to user profile.")

    emp = db.query(User).filter(User.id == user_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    if "SYSTEM_ADMIN" not in user_roles and current_user.id != user_id:
        if current_user.department_id != emp.department_id:
            raise HTTPException(status_code=403, detail="Managers can only view employee profiles in their department.")

    # 1. Enrolled Courses
    enrollments = db.query(CourseEnrollment).filter(CourseEnrollment.user_id == emp.id).all()
    courses_data = []
    for enr in enrollments:
        courses_data.append({
            "enrollment_id": enr.id,
            "course_id": enr.course_id,
            "course_title": enr.course.title if enr.course else "Course",
            "course_code": enr.course.course_code if enr.course else "",
            "progress_percent": enr.progress_percent,
            "status": enr.status,
            "enrolled_at": enr.enrolled_at.isoformat() if enr.enrolled_at else None,
            "completed_at": enr.completed_at.isoformat() if enr.completed_at else None
        })

    # 2. Taken Exams
    submissions = db.query(ExamSubmission).filter(ExamSubmission.user_id == emp.id).all()
    exams_data = []
    score_trend = []

    for s in submissions:
        overall_score = s.grade.overall_score if s.grade else None
        overall_feedback = s.grade.overall_feedback if s.grade else None
        grader_name = f"{s.grade.grader.first_name} {s.grade.grader.last_name}" if (s.grade and s.grade.grader) else "Reviewer"

        item = {
            "submission_id": s.id,
            "exam_id": s.exam_id,
            "exam_title": s.exam.title if s.exam else "Exam",
            "status": s.status,
            "started_at": s.started_at.isoformat() if s.started_at else None,
            "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
            "graded_at": s.grade.graded_at.isoformat() if (s.grade and s.grade.graded_at) else None,
            "overall_score": overall_score,
            "overall_feedback": overall_feedback,
            "grader_name": grader_name,
            "scores": s.grade.scores if s.grade else {}
        }
        exams_data.append(item)

        if s.status == "graded" and overall_score is not None:
            score_date = s.grade.graded_at.isoformat() if (s.grade and s.grade.graded_at) else (s.submitted_at.isoformat() if s.submitted_at else "")
            score_trend.append({
                "date": score_date,
                "score": overall_score,
                "exam_title": s.exam.title if s.exam else "Exam"
            })

    # Sort score trend chronologically
    score_trend.sort(key=lambda x: x["date"])

    dept_name = emp.department.name if emp.department else "General"
    emp_roles = [r.name for r in emp.roles]

    return {
        "user": {
            "id": emp.id,
            "employee_code": emp.employee_code,
            "first_name": emp.first_name,
            "last_name": emp.last_name,
            "email": emp.email,
            "department_id": emp.department_id,
            "department_name": dept_name,
            "role_name": emp_roles[0] if emp_roles else "EMPLOYEE"
        },
        "courses": courses_data,
        "exams": exams_data,
        "score_trend": score_trend
    }
