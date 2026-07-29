import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_
from typing import List, Dict, Any, Optional

from app.models.department import Department
from app.models.user import User
from app.models.course import Course
from app.models.course_enrollment import CourseEnrollment
from app.models.exam import Exam, ExamSubmission, ExamGrade

class DashboardService:

    @staticmethod
    def get_summary(db: Session, manager_dept_id: Optional[Any] = None) -> Dict[str, Any]:
        from app.models.user_role import UserRole
        from app.models.role import Role

        base_users_query = db.query(User).join(
            UserRole, User.id == UserRole.user_id
        ).join(
            Role, UserRole.role_id == Role.id
        ).filter(
            User.is_active == True,
            User.is_deleted == False,
            Role.name == "EMPLOYEE"
        )

        if manager_dept_id:
            total_departments = 1
            total_users = base_users_query.filter(User.department_id == manager_dept_id).count()
            total_courses = db.query(Course).filter(Course.is_published == True, Course.department_id == manager_dept_id).count()
            total_all_courses = db.query(Course).filter(Course.department_id == manager_dept_id).count()
            completed_enrollments = db.query(CourseEnrollment).join(
                Course, CourseEnrollment.course_id == Course.id
            ).filter(
                CourseEnrollment.status == "completed",
                Course.department_id == manager_dept_id
            ).count()
        else:
            total_departments = db.query(Department).count()
            total_users = base_users_query.count()
            total_courses = db.query(Course).filter(Course.is_published == True).count()
            total_all_courses = db.query(Course).count()
            completed_enrollments = db.query(CourseEnrollment).filter(
                CourseEnrollment.status == "completed"
            ).count()
        
        # Best Manager calculation (only for global admins)
        best_manager_data = None
        if not manager_dept_id:
            mgr_role = db.query(Role).filter(Role.name == "COURSE_MANAGER").first()
            if mgr_role:
                managers = db.query(User).join(
                    UserRole, User.id == UserRole.user_id
                ).filter(
                    UserRole.role_id == mgr_role.id,
                    User.is_active == True,
                    User.is_deleted == False
                ).all()

                best_mgr = None
                max_activity = -1
                best_mgr_courses = 0
                best_mgr_grades = 0

                for m in managers:
                    courses_created = db.query(Course).filter(Course.created_by == m.id).count()
                    grades_done = db.query(ExamSubmission).join(
                        ExamGrade, ExamSubmission.id == ExamGrade.submission_id
                    ).filter(
                        ExamGrade.graded_by == m.id,
                        ExamSubmission.status == "graded"
                    ).count()
                    
                    activity = courses_created + grades_done
                    if activity > max_activity:
                        max_activity = activity
                        best_mgr = m
                        best_mgr_courses = courses_created
                        best_mgr_grades = grades_done
                
                if best_mgr:
                    best_manager_data = {
                        "name": f"{best_mgr.first_name} {best_mgr.last_name}",
                        "email": best_mgr.email,
                        "department_name": best_mgr.department.name if best_mgr.department else "General",
                        "courses_count": best_mgr_courses,
                        "reviews_count": best_mgr_grades,
                        "activity_score": max_activity
                    }

        # System status
        health_status = "Healthy"
        cluster_nodes = "3 Clusters"

        return {
            "total_departments": total_departments,
            "total_users": total_users,
            "total_published_courses": total_courses,
            "total_courses": total_all_courses,
            "health_status": health_status,
            "cluster_nodes": cluster_nodes,
            "completed_enrollments": completed_enrollments,
            "best_manager": best_manager_data
        }

    @staticmethod
    def get_completion_rate(db: Session, manager_dept_id: Optional[Any] = None) -> Any:
        base_query = db.query(CourseEnrollment).join(
            Course, CourseEnrollment.course_id == Course.id
        ).filter(
            Course.status == "published"
        )
        if manager_dept_id:
            base_query = base_query.filter(Course.department_id == manager_dept_id)
            
        total_enrollments = base_query.count()
        if total_enrollments == 0:
            chart = [
                {"label": "Completed", "value": 0, "color": "#10b981"},
                {"label": "In Progress", "value": 0, "color": "#00f2fe"},
                {"label": "Not Started", "value": 100, "color": "#64748b"}
            ]
            if manager_dept_id:
                return {
                    "completed_percent": 0,
                    "completed_count": 0,
                    "total_count": 0,
                    "chart_data": chart
                }
            return chart

        completed = base_query.filter(CourseEnrollment.status == "completed").count()
        in_progress = base_query.filter(CourseEnrollment.status == "in_progress").count()

        comp_pct = round((completed / total_enrollments) * 100)
        in_prog_pct = round((in_progress / total_enrollments) * 100)
        not_started_pct = max(0, 100 - comp_pct - in_prog_pct)

        chart = [
            {"label": "Completed", "value": comp_pct, "color": "#10b981"},
            {"label": "In Progress", "value": in_prog_pct, "color": "#00f2fe"},
            {"label": "Not Started", "value": not_started_pct, "color": "#64748b"}
        ]
        
        if manager_dept_id:
            return {
                "completed_percent": comp_pct,
                "completed_count": completed,
                "total_count": total_enrollments,
                "chart_data": chart
            }
        return chart

    @staticmethod
    def get_enrollment_trend(db: Session, range_days: int = 180, manager_dept_id: Optional[Any] = None) -> List[Dict[str, Any]]:
        # Aggregate enrollments over recent period
        cutoff_date = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=range_days)
        
        if range_days <= 90:
            # Daily aggregate for shorter ranges (30d/90d)
            query = db.query(
                func.to_char(CourseEnrollment.enrolled_at, 'YYYY-MM-DD').label('date_str'),
                func.count(CourseEnrollment.id).label('count')
            ).join(
                Course, CourseEnrollment.course_id == Course.id
            ).filter(
                CourseEnrollment.enrolled_at >= cutoff_date,
                Course.status == "published"
            )
            if manager_dept_id:
                query = query.filter(Course.department_id == manager_dept_id)
                
            results = query.group_by('date_str').order_by('date_str').all()
            
            if not results:
                return []
                
            return [{"date": row.date_str, "label": row.date_str, "count": int(row.count), "value": int(row.count)} for row in results]

        # Monthly aggregate for longer ranges
        query = db.query(
            func.to_char(CourseEnrollment.enrolled_at, 'Mon').label('month_name'),
            func.date_trunc('month', CourseEnrollment.enrolled_at).label('month_date'),
            func.count(CourseEnrollment.id).label('count')
        ).join(
            Course, CourseEnrollment.course_id == Course.id
        ).filter(
            CourseEnrollment.enrolled_at >= cutoff_date,
            Course.status == "published"
        )
        if manager_dept_id:
            query = query.filter(Course.department_id == manager_dept_id)
            
        results = query.group_by(
            'month_name', 'month_date'
        ).order_by(
            'month_date'
        ).all()

        if not results:
            if manager_dept_id:
                return []
            # Provide current monthly baseline fallback if no enrollments in range
            now = datetime.datetime.now()
            months = [(now - datetime.timedelta(days=30 * i)).strftime('%b') for i in reversed(range(6))]
            return [{"label": m, "value": 0} for m in months]

        return [{"label": row.month_name, "date": row.month_name, "count": int(row.count), "value": int(row.count)} for row in results]

    @staticmethod
    def get_department_performance(db: Session, manager_dept_id: Optional[Any] = None) -> List[Dict[str, Any]]:
        if manager_dept_id:
            departments = db.query(Department).filter(Department.id == manager_dept_id).all()
        else:
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
            ).join(
                Course, CourseEnrollment.course_id == Course.id
            ).filter(
                User.department_id == dept.id,
                Course.status == "published"
            ).count()

            completed_enrollments = db.query(CourseEnrollment).join(
                User, CourseEnrollment.user_id == User.id
            ).join(
                Course, CourseEnrollment.course_id == Course.id
            ).filter(
                User.department_id == dept.id,
                CourseEnrollment.status == "completed",
                Course.status == "published"
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
    def get_active_inactive_learners(db: Session, manager_dept_id: Optional[Any] = None) -> List[Dict[str, Any]]:
        from app.models.user_role import UserRole
        from app.models.role import Role

        base_users_query = db.query(User).join(
            UserRole, User.id == UserRole.user_id
        ).join(
            Role, UserRole.role_id == Role.id
        ).filter(
            User.is_active == True,
            User.is_deleted == False,
            Role.name == "EMPLOYEE"
        )

        users_query = base_users_query
        if manager_dept_id:
            users_query = users_query.filter(User.department_id == manager_dept_id)
        total_users = users_query.count()
        if total_users == 0:
            return [
                {"label": "Active", "value": 100, "color": "#10b981"},
                {"label": "Inactive", "value": 0, "color": "#f59e0b"}
            ]

        thirty_days_ago = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=30)
        
        # Users with recent submissions or enrollments
        sub_query = db.query(ExamSubmission.user_id).filter(ExamSubmission.started_at >= thirty_days_ago)
        enr_query = db.query(CourseEnrollment.user_id).join(
            Course, CourseEnrollment.course_id == Course.id
        ).filter(
            CourseEnrollment.enrolled_at >= thirty_days_ago,
            Course.status == "published"
        )
        created_query = db.query(User.id).filter(
            User.created_at >= thirty_days_ago,
            User.is_active == True,
            User.is_deleted == False
        )
        
        if manager_dept_id:
            sub_query = sub_query.join(User, ExamSubmission.user_id == User.id).filter(User.department_id == manager_dept_id)
            enr_query = enr_query.join(User, CourseEnrollment.user_id == User.id).filter(User.department_id == manager_dept_id)
            created_query = created_query.filter(User.department_id == manager_dept_id)
            
        active_sub_users = sub_query.distinct()
        active_enr_users = enr_query.distinct()
        active_created_users = created_query

        active_count_query = base_users_query.filter(
            or_(
                User.id.in_(active_sub_users),
                User.id.in_(active_enr_users),
                User.id.in_(active_created_users)
            )
        )
        if manager_dept_id:
            active_count_query = active_count_query.filter(User.department_id == manager_dept_id)
            
        active_count = active_count_query.count()

        active_pct = round((active_count / total_users) * 100)
        inactive_pct = max(0, 100 - active_pct)

        return [
            {"label": "Active", "value": active_pct, "color": "#10b981"},
            {"label": "Inactive", "value": inactive_pct, "color": "#f59e0b"}
        ]

    @staticmethod
    def get_top_courses(db: Session, limit: int = 5, manager_dept_id: Optional[Any] = None) -> List[Dict[str, Any]]:
        query = db.query(
            Course.id,
            Course.course_code,
            Course.title,
            func.count(CourseEnrollment.id).label('enrollments_count')
        ).outerjoin(
            CourseEnrollment, Course.id == CourseEnrollment.course_id
        ).filter(
            Course.status == "published"
        )
        if manager_dept_id:
            query = query.filter(Course.department_id == manager_dept_id)
            
        results = query.group_by(
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
    def get_exam_pass_fail(db: Session, manager_dept_id: Optional[Any] = None) -> Any:
        query = db.query(ExamGrade.overall_score).filter(ExamGrade.overall_score.isnot(None))
        if manager_dept_id:
            query = query.join(
                ExamSubmission, ExamGrade.submission_id == ExamSubmission.id
            ).join(
                Exam, ExamSubmission.exam_id == Exam.id
            ).join(
                Course, Exam.course_id == Course.id
            ).filter(
                Course.department_id == manager_dept_id
            )
            
        graded_grades = query.all()
        if not graded_grades:
            chart = [
                {"label": "Passed (>= 8.0)", "value": 0, "color": "#10b981"},
                {"label": "Needs Impr. (< 8.0)", "value": 0, "color": "#ef4444"}
            ]
            if manager_dept_id:
                return {
                    "passed_count": 0,
                    "failed_count": 0,
                    "chart_data": chart
                }
            return [
                {"label": "Passed (>= 8.0)", "value": 100, "color": "#10b981"},
                {"label": "Needs Impr. (< 8.0)", "value": 0, "color": "#ef4444"}
            ]

        total = len(graded_grades)
        passed = sum(1 for g in graded_grades if g.overall_score >= 8.0)
        passed_pct = round((passed / total) * 100)
        needs_impr_pct = max(0, 100 - passed_pct)

        chart = [
            {"label": "Passed (>= 8.0)", "value": passed_pct, "color": "#10b981"},
            {"label": "Needs Impr. (< 8.0)", "value": needs_impr_pct, "color": "#ef4444"}
        ]
        
        if manager_dept_id:
            return {
                "passed_count": passed,
                "failed_count": total - passed,
                "chart_data": chart
            }
        return chart

    @staticmethod
    def get_pending_approvals(db: Session, manager_dept_id: Optional[Any] = None) -> Dict[str, Any]:
        courses_query = db.query(Course).filter(Course.status == "pending")
        submissions_query = db.query(ExamSubmission).filter(ExamSubmission.status == "submitted")
        
        if manager_dept_id:
            courses_query = courses_query.filter(Course.department_id == manager_dept_id)
            submissions_query = submissions_query.join(User, ExamSubmission.user_id == User.id).filter(User.department_id == manager_dept_id)
            
        pending_courses = courses_query.count()
        pending_exam_reviews = submissions_query.count()
        total_pending = pending_courses + pending_exam_reviews

        return {
            "pending_courses_count": pending_courses,
            "pending_exam_reviews_count": pending_exam_reviews,
            "total_pending": total_pending
        }

    @staticmethod
    def get_top_performers(db: Session, limit: int = 5, manager_dept_id: Optional[Any] = None) -> List[Dict[str, Any]]:
        query = db.query(
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
        )
        if manager_dept_id:
            query = query.filter(User.department_id == manager_dept_id)
            
        results = query.group_by(
            User.id, User.first_name, User.last_name, User.employee_code, Department.name
        ).order_by(
            func.avg(ExamGrade.overall_score).desc()
        ).limit(limit).all()

        output = []
        for idx, row in enumerate(results):
            from app.models.user_badge import UserBadge
            from app.models.badge_tier import BadgeTier
            highest_badge = db.query(UserBadge).join(
                BadgeTier, UserBadge.badge_tier_id == BadgeTier.id
            ).filter(
                UserBadge.user_id == row.id
            ).order_by(
                BadgeTier.tier_order.desc()
            ).first()
            badge_name = highest_badge.badge_tier.name if highest_badge else None

            output.append({
                "user_id": str(row.id),
                "name": f"{row.first_name} {row.last_name}",
                "employee_code": row.employee_code,
                "department_name": row.department_name or "General",
                "badge_name": badge_name,
                "score": round(float(row.user_avg), 1),
                "rank": idx + 1
            })
        return output

    @staticmethod
    def get_avg_score_per_course(db: Session, manager_dept_id: Optional[Any] = None) -> List[Dict[str, Any]]:
        query = db.query(
            Course.id,
            Course.course_code,
            Course.title.label("course_title"),
            func.avg(ExamGrade.overall_score).label("avg_score")
        ).join(
            Exam, Course.id == Exam.course_id
        ).join(
            ExamSubmission, Exam.id == ExamSubmission.exam_id
        ).join(
            ExamGrade, ExamSubmission.id == ExamGrade.submission_id
        ).filter(
            ExamSubmission.status == "graded",
            ExamGrade.overall_score.isnot(None),
            Course.status == "published"
        )
        
        if manager_dept_id:
            query = query.filter(Course.department_id == manager_dept_id)
            
        results = query.group_by(Course.id, Course.course_code, Course.title).all()
        
        if not results:
            return []
            
        colors = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"]
        return [
            {
                "id": str(row.id),
                "course_code": row.course_code,
                "course_title": row.course_title,
                "avg_score": round(float(row.avg_score), 2),
                "label": f"{row.course_code}",
                "value": round(float(row.avg_score), 2),
                "color": colors[idx % len(colors)]
            }
            for idx, row in enumerate(results)
        ]
