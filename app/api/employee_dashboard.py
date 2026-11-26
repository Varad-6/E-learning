from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import datetime

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.course import Course
from app.models.course_enrollment import CourseEnrollment
from app.models.course_module import CourseModule
from app.models.quiz import Quiz
from app.models.quiz_attempt import QuizAttempt
from app.models.exam import Exam, ExamSubmission, ExamGrade
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

    # Ensure user is auto-enrolled in all applicable department / all-department published courses
    from app.services.enrollment_service import EnrollmentService
    EnrollmentService.auto_enroll_user_in_mandatory_courses(db, current_user.id)

    # 1. Fetch Enrolled Courses
    enrollments = db.query(CourseEnrollment).join(
        Course, CourseEnrollment.course_id == Course.id
    ).filter(
        CourseEnrollment.user_id == current_user.id,
        Course.is_published == True,
        Course.status.in_(["approved", "published"])
    ).all()

    mandatory_courses = []
    assigned_courses = []
    completed_count = 0

    for e in enrollments:
        if e.status == "completed" or (e.progress_percent or 0) >= 100:
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

        # Calculate module counts & average assessment score for this course
        mods = db.query(CourseModule).filter(CourseModule.course_id == e.course_id).all()
        mod_ids = [m.id for m in mods]
        total_mods_count = len(mods)

        quizzes = db.query(Quiz).filter(Quiz.module_id.in_(mod_ids)).all() if mod_ids else []
        quiz_ids = [q.id for q in quizzes]
        course_scores = []
        if quiz_ids:
            user_attempts = db.query(QuizAttempt).filter(
                QuizAttempt.user_id == current_user.id,
                QuizAttempt.quiz_id.in_(quiz_ids),
                QuizAttempt.score.isnot(None)
            ).all()
            seen_q = set()
            for a in sorted(user_attempts, key=lambda x: x.completed_at or datetime.datetime.min.replace(tzinfo=datetime.timezone.utc), reverse=True):
                if a.quiz_id not in seen_q:
                    seen_q.add(a.quiz_id)
                    course_scores.append(round(float(a.score) / 10.0, 1))

        course_avg = round(sum(course_scores) / len(course_scores), 1) if course_scores else None
        c_status = "completed" if (e.status == "completed" or (e.progress_percent or 0) >= 100) else ("in_progress" if (e.progress_percent or 0) > 0 else "enrolled")

        item = DashboardCourseItem(
            id=e.course_id,
            enrollment_id=e.id,
            course_code=e.course.course_code,
            title=e.course.title,
            department_tag=e.course.department.code if e.course.department else "GEN",
            progress_percent=100 if c_status == "completed" else (e.progress_percent or 0),
            due_date=due_date,
            urgency_level=urgency_level,
            status=c_status,
            is_mandatory=bool(e.course.is_mandatory),
            avg_score=course_avg,
            total_modules=total_mods_count,
            completed_modules=int(((e.progress_percent or 0) / 100.0) * total_mods_count) if total_mods_count > 0 else 0
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
        Course.status.in_(["approved", "published"])
    )
    if enrolled_course_ids:
        available_query = available_query.filter(Course.id.notin_(enrolled_course_ids))

    # Scoping: Non-admin users are strictly scoped to their department or company-wide (NULL) courses
    user_roles = [r.name for r in current_user.roles]
    is_global_admin = "SYSTEM_ADMIN" in user_roles or "HR_ADMIN" in user_roles
    if not is_global_admin:
        from sqlalchemy import or_
        from app.models.course_department import CourseDepartment
        if current_user.department_id:
            dept_course_ids = [r[0] for r in db.query(CourseDepartment.course_id).filter(CourseDepartment.department_id == current_user.department_id).all()]
            filters = [
                Course.department_id == current_user.department_id,
                Course.department_id.is_(None)
            ]
            if dept_course_ids:
                filters.append(Course.id.in_(dept_course_ids))
            available_query = available_query.filter(or_(*filters))
        else:
            available_query = available_query.filter(Course.department_id.is_(None))

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

    # 4. Next Badge Milestone & Earned Badges (Real DB-driven, zero hardcoding)
    from app.services.badge_service import BadgeService
    from app.models.badge_tier import BadgeTier

    all_badge_tiers = BadgeService.ensure_badge_tiers(db)
    earned_user_badges = BadgeService.get_user_badges(db, user_id=current_user.id)
    earned_tier_ids = {ub.badge_tier_id for ub in earned_user_badges}

    next_tier = next((t for t in all_badge_tiers if t.id not in earned_tier_ids), None)
    if next_tier:
        next_badge_milestone = NextBadgeMilestone(
            tier_name=next_tier.name,
            courses_remaining=max(0, next_tier.courses_required_cumulative - completed_count)
        )
    else:
        next_badge_milestone = NextBadgeMilestone(
            tier_name=None,
            courses_remaining=0
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
        ).order_by(
            ExamSubmission.submitted_at.desc().nullslast(),
            ExamSubmission.started_at.desc().nullslast()
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

    if earned_user_badges:
        highest_earned = earned_user_badges[-1]
        badge_tier = highest_earned.badge_tier.name if highest_earned.badge_tier else None

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

    from sqlalchemy import or_ as cat_or
    from app.models.course_department import CourseDepartment as CatCourseDept
    for d in depts:
        dept_course_ids = [
            r[0] for r in db.query(CatCourseDept.course_id).filter(
                CatCourseDept.department_id == d.id
            ).all()
        ]
        cat_filters = [
            Course.department_id == d.id,
            Course.department_id.is_(None)
        ]
        if dept_course_ids:
            cat_filters.append(Course.id.in_(dept_course_ids))
        course_count = db.query(Course).filter(
            Course.is_published == True,
            Course.status.in_(["approved", "published"]),
            cat_or(*cat_filters)
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

    # Calculate employee's exam and assessment score trend
    trend_items = []

    # 1. Graded Standalone Exam Submissions (0-10 scale), distinct latest per exam
    user_exam_subs = db.query(ExamSubmission).join(
        ExamGrade, ExamGrade.submission_id == ExamSubmission.id
    ).filter(
        ExamSubmission.user_id == current_user.id,
        ExamSubmission.status == "graded",
        ExamGrade.overall_score.isnot(None)
    ).order_by(ExamSubmission.submitted_at.desc().nullslast()).all()

    seen_exams = set()
    latest_exam_subs = []
    for sub in user_exam_subs:
        if sub.exam_id not in seen_exams:
            seen_exams.add(sub.exam_id)
            latest_exam_subs.append(sub)

    for sub in latest_exam_subs:
        exam_title = sub.exam.title if sub.exam else "Exam"
        course_title = sub.exam.course.title if (sub.exam and sub.exam.course) else "Standalone Exam"
        course_id = str(sub.exam.course_id) if (sub.exam and sub.exam.course_id) else "standalone"
        course_code = sub.exam.course.course_code if (sub.exam and sub.exam.course) else ""
        score = sub.grade.overall_score if sub.grade else 0.0
        t_val = sub.submitted_at
        if t_val and t_val.tzinfo is None:
            t_val = t_val.replace(tzinfo=datetime.timezone.utc)
        trend_items.append({
            "label": exam_title,
            "value": round(float(score), 1),
            "score_percent": round(float(score) * 10, 1),
            "passing_score": 6.0,
            "passed": score >= 6.0,
            "course_id": course_id,
            "course_title": course_title,
            "course_code": course_code,
            "module_title": "Comprehensive Final Exam",
            "date": t_val.strftime("%b %d, %Y") if t_val else "",
            "time": t_val or datetime.datetime.min.replace(tzinfo=datetime.timezone.utc)
        })

    # 2. Module Assessment Quizzes (scaled from 0-100% to 0-10 score), distinct latest per quiz
    user_quiz_attempts = db.query(QuizAttempt).filter(
        QuizAttempt.user_id == current_user.id,
        QuizAttempt.score.isnot(None)
    ).order_by(QuizAttempt.completed_at.desc().nullslast()).all()

    seen_quizzes = set()
    latest_quiz_attempts = []
    for att in user_quiz_attempts:
        if att.quiz_id not in seen_quizzes:
            seen_quizzes.add(att.quiz_id)
            latest_quiz_attempts.append(att)

    for att in latest_quiz_attempts:
        quiz_title = att.quiz.title if att.quiz else "Module Assessment"
        mod = db.query(CourseModule).filter(CourseModule.id == att.quiz.module_id).first() if att.quiz else None
        course = db.query(Course).filter(Course.id == mod.course_id).first() if mod else None
        scaled_score = round(float(att.score) / 10.0, 1) # convert 100% -> 10.0 scale
        passing_10 = round(float(att.quiz.passing_score or 66) / 10.0, 1) if att.quiz else 6.6
        t_val = att.completed_at
        if t_val and t_val.tzinfo is None:
            t_val = t_val.replace(tzinfo=datetime.timezone.utc)
        trend_items.append({
            "label": quiz_title,
            "value": scaled_score,
            "score_percent": round(float(att.score), 1),
            "passing_score": passing_10,
            "passed": bool(att.passed),
            "course_id": str(course.id) if course else "general",
            "course_title": course.title if course else "General Course",
            "course_code": course.course_code if course else "",
            "module_title": mod.title if mod else "Module Assessment",
            "date": t_val.strftime("%b %d, %Y") if t_val else "",
            "time": t_val or datetime.datetime.min.replace(tzinfo=datetime.timezone.utc)
        })

    # Sort all assessments chronologically (oldest to newest)
    trend_items.sort(key=lambda x: x["time"])

    # Keep all assessments (up to recent 60) so course-wise filtering has complete history
    recent_trend = trend_items[-60:] if len(trend_items) > 60 else trend_items

    exam_score_trend = recent_trend if recent_trend else [
        {
            "label": "Baseline",
            "value": 0,
            "score_percent": 0,
            "passing_score": 6.0,
            "passed": False,
            "course_id": "all",
            "course_title": "No exams taken yet",
            "course_code": "",
            "module_title": "Baseline",
            "date": ""
        }
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
