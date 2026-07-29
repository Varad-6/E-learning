from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import datetime

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.course import Course
from app.models.course_enrollment import CourseEnrollment
from app.models.exam import Exam, ExamSubmission
from app.models.notification import Notification
from app.models.department import Department as DBDept
from app.schemas.dashboard import (
    EmployeeDashboardResponse,
    DashboardCourseItem,
    DashboardAvailableCourseItem,
    DashboardExamItem,
    DashboardProgress,
    NextBadgeMilestone,
    MyRank,
    RecentActivityItem,
    CourseCategoryTile
)

router = APIRouter(prefix="/api/employee/dashboard", tags=["Employee Dashboard"])

BADGES = {
    1: "Novice Explorer",
    2: "Pathway Learner",
    3: "Skill Builder",
    4: "Knowledge Seeker",
    5: "Pro Practitioner",
    6: "Subject Specialist",
    7: "Elite Achiever",
    8: "Master Mentor",
    9: "Continuous Improver",
    10: "Grandmaster of Kaizen"
}

BADGE_ICONS = {
    1: "🥉",
    2: "🥉✨",
    3: "🥈",
    4: "🥈✨",
    5: "🥇",
    6: "🥇✨",
    7: "🎖️",
    8: "🎖️✨",
    9: "💎",
    10: "👑"
}

DEPT_COLORS = {
    "AI": "#3b82f6",
    "FICO": "#10b981",
    "ABAP": "#8b5cf6",
    "HR": "#f59e0b"
}

@router.get(
    "",
    response_model=EmployeeDashboardResponse,
    summary="Get Aggregated Employee Dashboard Data"
)
def get_employee_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    now = datetime.datetime.now(datetime.timezone.utc)

    # 1. Fetch Enrolled Courses
    enrollments = db.query(CourseEnrollment).join(
        Course, CourseEnrollment.course_id == Course.id
    ).filter(
        CourseEnrollment.user_id == current_user.id
    ).all()

    mandatory_courses = []
    assigned_courses = []
    completed_count = 0

    for e in enrollments:
        if e.status == "completed" or e.progress_percent == 100:
            completed_count += 1

        due_date = e.expires_at
        urgency_level = "neutral"
        if due_date:
            # Handle timezone naive vs aware
            due_dt = due_date
            if due_dt.tzinfo is None:
                due_dt = due_dt.replace(tzinfo=datetime.timezone.utc)
            
            remaining = due_dt - now
            if remaining.days < 3:
                urgency_level = "red"
            elif remaining.days < 7:
                urgency_level = "amber"

        item = DashboardCourseItem(
            id=e.course_id,
            enrollment_id=e.id,
            course_code=e.course.course_code,
            title=e.course.title,
            department_tag=e.course.department.code if e.course.department else "GEN",
            progress_percent=e.progress_percent,
            due_date=due_date,
            urgency_level=urgency_level
        )

        if e.course.is_mandatory:
            mandatory_courses.append(item)
        else:
            assigned_courses.append(item)

    # 2. Fetch Available Courses
    enrolled_course_ids = [r[0] for r in db.query(CourseEnrollment.course_id).filter(
        CourseEnrollment.user_id == current_user.id
    ).all()]

    available_query = db.query(Course).filter(
        Course.is_published == True,
        Course.status.in_(["approved", "published"]),
        Course.id.notin_(enrolled_course_ids)
    )


    db_available = available_query.limit(4).all()
    available_courses = [
        DashboardAvailableCourseItem(
            id=c.id,
            course_code=c.course_code,
            title=c.title,
            description=c.description,
            duration=c.duration
        ) for c in db_available
    ]

    # 3. Overall Progress
    total_enrolled = len(enrollments)
    percent = (completed_count / total_enrolled * 100.0) if total_enrolled > 0 else 0.0
    overall_progress = DashboardProgress(
        completed=completed_count,
        total=total_enrolled,
        percent=round(percent, 1)
    )

    # 4. Next Badge Milestone
    next_step = completed_count + 1
    if next_step <= 10:
        tier_name = f"{BADGE_ICONS[next_step]} {BADGES[next_step]}"
        courses_remaining = 1
    else:
        tier_name = f"{BADGE_ICONS[10]} {BADGES[10]}"
        courses_remaining = 0
    next_badge_milestone = NextBadgeMilestone(
        tier_name=tier_name,
        courses_remaining=courses_remaining
    )

    # 5. Upcoming Exams — query published exams for the employee's department directly,
    # not joined through enrollments (exams are assigned department-wide, independent of enrollment).
    from sqlalchemy import or_ as sql_or
    exam_query = db.query(Exam).filter(
        Exam.is_published == True,
        sql_or(
            Exam.department_id == current_user.department_id,
            Exam.department_id.is_(None)
        )
    )
    exams = exam_query.all()

    upcoming_exams = []
    for exam in exams:
        sub = db.query(ExamSubmission).filter(
            ExamSubmission.exam_id == exam.id,
            ExamSubmission.user_id == current_user.id
        ).first()

        if not sub:
            sub = ExamSubmission(
                exam_id=exam.id,
                user_id=current_user.id,
                status="assigned",
                answers={}
            )
            db.add(sub)
            db.commit()
            db.refresh(sub)

        if sub.status in ["assigned", "in_progress"]:
            due_date = None
            # Try to find a related enrollment for deadline info
            if exam.course_id:
                enrollment = db.query(CourseEnrollment).filter(
                    CourseEnrollment.user_id == current_user.id,
                    CourseEnrollment.course_id == exam.course_id
                ).first()
                due_date = enrollment.expires_at if enrollment else None

            upcoming_exams.append(
                DashboardExamItem(
                    id=sub.id,
                    exam_id=exam.id,
                    exam_title=exam.title,
                    course_title=exam.course.title if exam.course else "Standalone Exam",
                    course_code=exam.course.course_code if exam.course else None,
                    due_date=due_date,
                    duration_minutes=exam.duration_minutes,
                    status=sub.status
                )
            )

    upcoming_exams.sort(key=lambda x: (x.due_date is None, x.due_date))

    # 6. Rank calculation
    position = None
    department = "General"
    badge_tier = None

    if current_user.department_id:
        department = current_user.department.name if current_user.department else "General"
        
    from sqlalchemy import func
    from app.models.exam import ExamGrade
    from app.models.role import Role
    from app.models.user_role import UserRole
    
    # Query all active employees in user's department (or globally if no department)
    dept_users_query = db.query(User).join(
        UserRole, User.id == UserRole.user_id
    ).join(
        Role, UserRole.role_id == Role.id
    ).filter(
        User.is_active == True,
        User.is_deleted == False,
        Role.name == "EMPLOYEE"
    )
    
    if current_user.department_id:
        dept_users_query = dept_users_query.filter(User.department_id == current_user.department_id)
        
    dept_users = dept_users_query.all()
    
    # Query avg scores for all graded submissions
    graded_scores_query = db.query(
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
        Role.name == "EMPLOYEE"
    )
    
    if current_user.department_id:
        graded_scores_query = graded_scores_query.filter(User.department_id == current_user.department_id)
        
    graded_scores = graded_scores_query.group_by(ExamSubmission.user_id).all()
    
    # Map users to their average scores
    scores_map = {str(row.user_id): float(row.avg_score) for row in graded_scores}
    
    # Split users into ranked (at least 1 graded exam) and unranked (0 graded exams)
    ranked_users = []
    unranked_users = []
    
    for u in dept_users:
        user_id_str = str(u.id)
        if user_id_str in scores_map:
            ranked_users.append((u, scores_map[user_id_str]))
        else:
            unranked_users.append(u)
            
    # Sort ranked users: by score DESC, then name ASC
    ranked_users.sort(key=lambda x: (-x[1], (x[0].first_name or '').lower(), (x[0].last_name or '').lower()))
    
    # Sort unranked users: by name ASC
    unranked_users.sort(key=lambda u: ((u.first_name or '').lower(), (u.last_name or '').lower()))
    
    # Combine lists to form final rankings
    final_rankings = []
    for u, score in ranked_users:
        final_rankings.append(str(u.id))
    for u in unranked_users:
        final_rankings.append(str(u.id))
        
    # Find current user's position
    current_user_id_str = str(current_user.id)
    if current_user_id_str in final_rankings:
        position = final_rankings.index(current_user_id_str) + 1

    if completed_count > 0:
        step = min(completed_count, 10)
        badge_tier = f"{BADGE_ICONS[step]} {BADGES[step]}"

    my_rank = MyRank(
        position=position,
        department=department,
        badge_tier=badge_tier
    )

    # 7. Recent notifications
    notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(
        Notification.created_at.desc()
    ).limit(6).all()

    recent_activity = [
        RecentActivityItem(
            id=n.id,
            type=n.type,
            title=n.title,
            message=n.message,
            created_at=n.created_at,
            is_read=n.is_read
        ) for n in notifications
    ]

    # 8. Course categories (Restricted strictly to employee's own department)
    depts_query = db.query(DBDept)
    if current_user.department_id:
        depts_query = depts_query.filter(DBDept.id == current_user.department_id)
    depts = depts_query.all()
    course_categories = []

    for d in depts:
        course_count = db.query(Course).filter(
            Course.department_id == d.id,
            Course.is_published == True,
            Course.status.in_(["approved", "published"])
        ).count()

        color = DEPT_COLORS.get(d.code, "#6b7280")

        course_categories.append(
            CourseCategoryTile(
                department_id=d.id,
                department_name=d.name,
                department_code=d.code,
                course_count=course_count,
                color_token=color
            )
        )

    # Calculate employee's exam score trend
    from app.models.exam import ExamGrade
    graded_exams = db.query(
        Exam.title,
        ExamGrade.overall_score
    ).join(
        ExamSubmission, ExamSubmission.exam_id == Exam.id
    ).join(
        ExamGrade, ExamGrade.submission_id == ExamSubmission.id
    ).filter(
        ExamSubmission.user_id == current_user.id,
        ExamSubmission.status == "graded",
        ExamGrade.overall_score.isnot(None)
    ).order_by(
        ExamSubmission.submitted_at.asc()
    ).all()
    
    exam_score_trend = [{"label": row[0], "value": round(float(row[1]), 1)} for row in graded_exams]
    if not exam_score_trend:
        # Fallback baseline when no exams taken yet
        exam_score_trend = [
            {"label": "Baseline", "value": 0}
        ]

    # Calculate employee's course enrollment status breakdown
    completed_enr = db.query(CourseEnrollment).filter(
        CourseEnrollment.user_id == current_user.id,
        CourseEnrollment.status == "completed"
    ).count()
    in_progress_enr = db.query(CourseEnrollment).filter(
        CourseEnrollment.user_id == current_user.id,
        CourseEnrollment.status == "in_progress"
    ).count()
    enrolled_enr = db.query(CourseEnrollment).filter(
        CourseEnrollment.user_id == current_user.id,
        CourseEnrollment.status == "enrolled"
    ).count()
    
    category_progress = [
        {"label": "Completed", "value": completed_enr, "color": "#10b981"},
        {"label": "In Progress", "value": in_progress_enr, "color": "#00f2fe"},
        {"label": "Enrolled", "value": enrolled_enr, "color": "#f59e0b"}
    ]

    return EmployeeDashboardResponse(
        mandatory_courses=mandatory_courses,
        assigned_courses=assigned_courses,
        available_courses=available_courses,
        overall_progress=overall_progress,
        next_badge_milestone=next_badge_milestone,
        upcoming_exams=upcoming_exams,
        my_rank=my_rank,
        recent_activity=recent_activity,
        course_categories=course_categories,
        exam_score_trend=exam_score_trend,
        category_progress=category_progress
    )
