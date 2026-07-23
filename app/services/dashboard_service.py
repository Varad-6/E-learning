import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_
from typing import List, Dict, Any

from app.models.department import Department
from app.models.user import User
from app.models.course import Course
from app.models.course_enrollment import CourseEnrollment
from app.models.exam import Exam, ExamSubmission, ExamGrade

class DashboardService:

    @staticmethod
    def get_summary(db: Session) -> Dict[str, Any]:
        total_departments = db.query(Department).count()
        total_users = db.query(User).filter(User.is_active == True, User.is_deleted == False).count()
        total_courses = db.query(Course).filter(Course.is_published == True).count()
        total_all_courses = db.query(Course).count()
        
        # System status
        health_status = "Healthy"
        cluster_nodes = "3 Clusters"

        return {
            "total_departments": total_departments,
            "total_users": total_users,
            "total_published_courses": total_courses,
            "total_courses": total_all_courses,
            "health_status": health_status,
            "cluster_nodes": cluster_nodes
        }

    @staticmethod
    def get_completion_rate(db: Session) -> List[Dict[str, Any]]:
        total_enrollments = db.query(CourseEnrollment).count()
        if total_enrollments == 0:
            return [
                {"label": "Completed", "value": 0, "color": "#10b981"},
                {"label": "In Progress", "value": 0, "color": "#00f2fe"},
                {"label": "Not Started", "value": 100, "color": "#64748b"}
            ]

        completed = db.query(CourseEnrollment).filter(CourseEnrollment.status == "completed").count()
        in_progress = db.query(CourseEnrollment).filter(CourseEnrollment.status == "in_progress").count()
        enrolled_not_started = db.query(CourseEnrollment).filter(CourseEnrollment.status == "enrolled").count()

        comp_pct = round((completed / total_enrollments) * 100)
        in_prog_pct = round((in_progress / total_enrollments) * 100)
        not_started_pct = max(0, 100 - comp_pct - in_prog_pct)

        return [
            {"label": "Completed", "value": comp_pct, "color": "#10b981"},
            {"label": "In Progress", "value": in_prog_pct, "color": "#00f2fe"},
            {"label": "Not Started", "value": not_started_pct, "color": "#64748b"}
        ]

    @staticmethod
    def get_enrollment_trend(db: Session, range_days: int = 180) -> List[Dict[str, Any]]:
        # Aggregate enrollments by month over recent period
        cutoff_date = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=range_days)
        
        results = db.query(
            func.to_char(CourseEnrollment.enrolled_at, 'Mon').label('month_name'),
            func.date_trunc('month', CourseEnrollment.enrolled_at).label('month_date'),
            func.count(CourseEnrollment.id).label('count')
        ).filter(
            CourseEnrollment.enrolled_at >= cutoff_date
        ).group_by(
            'month_name', 'month_date'
        ).order_by(
            'month_date'
        ).all()

        if not results:
            # Provide current monthly baseline fallback if no enrollments in range
            now = datetime.datetime.now()
            months = [(now - datetime.timedelta(days=30 * i)).strftime('%b') for i in reversed(range(6))]
            return [{"label": m, "value": 0} for m in months]

        return [{"label": row.month_name, "value": int(row.count)} for row in results]

    @staticmethod
    def get_department_performance(db: Session) -> List[Dict[str, Any]]:
        departments = db.query(Department).all()
        colors = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"]
        
        output = []
        for idx, dept in enumerate(departments):
            avg_score_query = db.query(func.avg(ExamGrade.overall_score)).join(
                ExamSubmission, ExamGrade.submission_id == ExamSubmission.id
            ).join(
                User, ExamSubmission.user_id == User.id
            ).filter(
                User.department_id == dept.id,
                ExamSubmission.status == "graded"
            ).scalar()

            avg_score = round(float(avg_score_query), 1) if avg_score_query is not None else 0.0

            total_enrollments = db.query(CourseEnrollment).join(
                User, CourseEnrollment.user_id == User.id
            ).filter(
                User.department_id == dept.id
            ).count()

            completed_enrollments = db.query(CourseEnrollment).join(
                User, CourseEnrollment.user_id == User.id
            ).filter(
                User.department_id == dept.id,
                CourseEnrollment.status == "completed"
            ).count()

            comp_pct = round((completed_enrollments / total_enrollments) * 100) if total_enrollments > 0 else 0

            output.append({
                "label": dept.code,
                "name": dept.name,
                "value": avg_score,
                "completion_pct": comp_pct,
                "color": colors[idx % len(colors)]
            })

        return output

    @staticmethod
    def get_active_inactive_learners(db: Session) -> List[Dict[str, Any]]:
        total_users = db.query(User).filter(User.is_active == True, User.is_deleted == False).count()
        if total_users == 0:
            return [
                {"label": "Active", "value": 100, "color": "#10b981"},
                {"label": "Inactive", "value": 0, "color": "#f59e0b"}
            ]

        thirty_days_ago = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=30)
        
        # Users with recent submissions or enrollments
        active_sub_users = db.query(ExamSubmission.user_id).filter(
            ExamSubmission.started_at >= thirty_days_ago
        ).distinct()
        
        active_enr_users = db.query(CourseEnrollment.user_id).filter(
            CourseEnrollment.enrolled_at >= thirty_days_ago
        ).distinct()

        active_created_users = db.query(User.id).filter(
            User.created_at >= thirty_days_ago,
            User.is_active == True,
            User.is_deleted == False
        )

        active_count = db.query(User).filter(
            User.is_active == True,
            User.is_deleted == False,
            or_(
                User.id.in_(active_sub_users),
                User.id.in_(active_enr_users),
                User.id.in_(active_created_users)
            )
        ).count()

        active_pct = round((active_count / total_users) * 100)
        inactive_pct = max(0, 100 - active_pct)

        return [
            {"label": "Active", "value": active_pct, "color": "#10b981"},
            {"label": "Inactive", "value": inactive_pct, "color": "#f59e0b"}
        ]

    @staticmethod
    def get_top_courses(db: Session, limit: int = 5) -> List[Dict[str, Any]]:
        results = db.query(
            Course.id,
            Course.course_code,
            Course.title,
            func.count(CourseEnrollment.id).label('enrollments_count')
        ).outerjoin(
            CourseEnrollment, Course.id == CourseEnrollment.course_id
        ).filter(
            Course.is_published == True
        ).group_by(
            Course.id, Course.course_code, Course.title
        ).order_by(
            func.count(CourseEnrollment.id).desc()
        ).limit(limit).all()

        return [
            {
                "id": str(row.id),
                "course_code": row.course_code,
                "title": row.title,
                "enrollments_count": int(row.enrollments_count)
            }
            for row in results
        ]

    @staticmethod
    def get_exam_pass_fail(db: Session) -> List[Dict[str, Any]]:
        graded_grades = db.query(ExamGrade.overall_score).filter(ExamGrade.overall_score.isnot(None)).all()
        if not graded_grades:
            return [
                {"label": "Passed (>= 8.0)", "value": 100, "color": "#10b981"},
                {"label": "Needs Impr. (< 8.0)", "value": 0, "color": "#ef4444"}
            ]

        total = len(graded_grades)
        passed = sum(1 for g in graded_grades if g.overall_score >= 8.0)
        passed_pct = round((passed / total) * 100)
        needs_impr_pct = max(0, 100 - passed_pct)

        return [
            {"label": "Passed (>= 8.0)", "value": passed_pct, "color": "#10b981"},
            {"label": "Needs Impr. (< 8.0)", "value": needs_impr_pct, "color": "#ef4444"}
        ]

    @staticmethod
    def get_pending_approvals(db: Session) -> Dict[str, Any]:
        pending_courses = db.query(Course).filter(Course.status == "pending").count()
        pending_exam_reviews = db.query(ExamSubmission).filter(ExamSubmission.status == "submitted").count()
        total_pending = pending_courses + pending_exam_reviews

        return {
            "pending_courses_count": pending_courses,
            "pending_exam_reviews_count": pending_exam_reviews,
            "total_pending": total_pending
        }

    @staticmethod
    def get_top_performers(db: Session, limit: int = 5) -> List[Dict[str, Any]]:
        results = db.query(
            User.id,
            User.first_name,
            User.last_name,
            User.employee_code,
            Department.name.label("department_name"),
            func.avg(ExamGrade.overall_score).label("user_avg")
        ).join(
            ExamSubmission, ExamSubmission.user_id == User.id
        ).join(
            ExamGrade, ExamGrade.submission_id == ExamSubmission.id
        ).outerjoin(
            Department, User.department_id == Department.id
        ).filter(
            ExamSubmission.status == "graded",
            ExamGrade.overall_score.isnot(None),
            User.is_active == True,
            User.is_deleted == False
        ).group_by(
            User.id, User.first_name, User.last_name, User.employee_code, Department.name
        ).order_by(
            func.avg(ExamGrade.overall_score).desc()
        ).limit(limit).all()

        return [
            {
                "id": str(row.id),
                "name": f"{row.first_name} {row.last_name}",
                "employee_code": row.employee_code,
                "department_name": row.department_name or "General",
                "score": round(float(row.user_avg), 1)
            }
            for row in results
        ]

    @staticmethod
    def get_difficulty_distribution(db: Session) -> List[Dict[str, Any]]:
        results = db.query(
            Course.difficulty_level,
            func.count(Course.id)
        ).filter(
            Course.is_published == True
        ).group_by(
            Course.difficulty_level
        ).all()
        
        colors = {"beginner": "#10b981", "intermediate": "#8b5cf6", "advanced": "#ef4444"}
        output = []
        for row in results:
            diff = row[0].lower() if row[0] else "beginner"
            output.append({
                "label": diff.capitalize(),
                "value": int(row[1]),
                "color": colors.get(diff, "#64748b")
            })
        if not output:
            return [
                {"label": "Beginner", "value": 0, "color": "#10b981"},
                {"label": "Intermediate", "value": 0, "color": "#8b5cf6"},
                {"label": "Advanced", "value": 0, "color": "#ef4444"}
            ]
        return output
