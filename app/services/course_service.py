from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from uuid import UUID
import re
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from fastapi import HTTPException, status

from app.models.course import Course
from app.models.course_approval import CourseApproval
from app.models.course_module import CourseModule, CourseModuleAssociation
from app.models.course_department import CourseDepartment
from app.models.course_enrollment import CourseEnrollment
from app.models.module_content import ModuleContent
from app.models.user_course_progress import UserCourseProgress
from app.models.department import Department
from app.models.user import User
from app.core.dependencies import can_user_delete_course, can_user_edit_course
from app.schemas.course import (
    CourseCreate, CourseUpdate, MyCourseItem, MyCoursesSummary, MyCoursesResponse,
    CatalogCourseItem, CatalogResponse, CourseDetailResponse, CourseDetailModule
)

class CourseService:
    @staticmethod
    def create_course(db: Session, request: CourseCreate, user_id: UUID) -> Course:
        existing_course = db.query(Course).filter(Course.course_code == request.course_code).first()
        if existing_course:
            prefix = request.course_code.rsplit("-", 1)[0] if "-" in request.course_code else request.course_code
            matching = db.query(Course.course_code).filter(Course.course_code.like(f"{prefix}-%")).all()
            max_num = 100
            for (c_code,) in matching:
                try:
                    num = int(c_code.rsplit("-", 1)[1])
                    if num > max_num:
                        max_num = num
                except (ValueError, IndexError):
                    pass
            suggested = f"{prefix}-{max_num + 1}"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Course code '{request.course_code}' already exists. Next available code is '{suggested}'."
            )

        dept_ids = list(dict.fromkeys(request.department_ids or []))
        if dept_ids:
            valid_depts = {r[0] for r in db.query(Department.id).filter(Department.id.in_(dept_ids)).all()}
            missing = [str(d) for d in dept_ids if d not in valid_depts]
            if missing:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Department(s) not found: {', '.join(missing)}"
                )
        elif request.department_id:
            dept = db.query(Department).filter(Department.id == request.department_id).first()
            if not dept:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Department with ID {request.department_id} not found."
                )
            dept_ids = [request.department_id]

        total_dept_count = db.query(Department).count()
        is_all = (
            bool(request.is_all_departments)
            or (total_dept_count > 0 and len(dept_ids) >= total_dept_count)
            or (not dept_ids and request.department_id is None)
        )
        primary_dept_id = None if is_all else dept_ids[0]

        db_course = Course(
            course_code=request.course_code,
            title=request.title,
            description=request.description,
            difficulty_level=request.difficulty_level,
            department_id=primary_dept_id,
            created_by=user_id,
            status="approved",
            is_published=False,
            duration=request.duration,
            priority=request.priority,
            start_date=request.start_date,
            end_date=request.end_date,
            is_mandatory=request.is_mandatory,
            video_url=request.video_url.strip() if request.video_url else None
        )
        db.add(db_course)
        db.commit()
        db.refresh(db_course)

        # Department associations
        if is_all:
            all_depts = db.query(Department).all()
            for d in all_depts:
                db.add(CourseDepartment(course_id=db_course.id, department_id=d.id))
            db.commit()
        elif dept_ids:
            for d_id in dept_ids:
                db.add(CourseDepartment(course_id=db_course.id, department_id=d_id))
            db.commit()

        # Assign existing modules if requested
        if request.assigned_module_ids:
            for idx, mod_id in enumerate(request.assigned_module_ids):
                mod = db.query(CourseModule).filter(CourseModule.id == mod_id).first()
                if mod:
                    db.add(CourseModuleAssociation(
                        course_id=db_course.id,
                        module_id=mod_id,
                        sequence_no=idx + 1
                    ))
                    if not mod.course_id:
                        mod.course_id = db_course.id
            db.commit()

        # Auto-assign to employees only once published
        if db_course.is_published:
            from app.services.enrollment_service import EnrollmentService
            EnrollmentService.assign_course_to_departments(db, db_course.id)

        db.refresh(db_course)
        return db_course

    @staticmethod
    def update_course(db: Session, course_id: UUID, request: CourseUpdate) -> Course:
        db_course = db.query(Course).filter(Course.id == course_id).first()
        if not db_course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course with ID {course_id} not found."
            )

        if request.course_code and request.course_code != db_course.course_code:
            existing_course = db.query(Course).filter(Course.course_code == request.course_code).first()
            if existing_course:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Course code '{request.course_code}' already exists."
                )
            db_course.course_code = request.course_code

        dept_changed = False
        total_dept_count = db.query(Department).count()

        if request.is_all_departments is not None or request.department_ids is not None:
            dept_changed = True
            dept_ids = list(dict.fromkeys(request.department_ids or []))
            if dept_ids:
                valid_depts = {r[0] for r in db.query(Department.id).filter(Department.id.in_(dept_ids)).all()}
                missing = [str(d) for d in dept_ids if d not in valid_depts]
                if missing:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Department(s) not found: {', '.join(missing)}"
                    )

            is_all = False
            if request.is_all_departments is True:
                is_all = True
            elif dept_ids and total_dept_count > 0 and len(dept_ids) >= total_dept_count:
                is_all = True
            elif not dept_ids and request.department_id is not None:
                dept = db.query(Department).filter(Department.id == request.department_id).first()
                if not dept:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Department with ID {request.department_id} not found."
                    )
                dept_ids = [request.department_id]
            elif request.is_all_departments is False and not dept_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="At least one department must be selected."
                )

            db.query(CourseDepartment).filter(CourseDepartment.course_id == course_id).delete()
            if is_all:
                db_course.department_id = None
                all_depts = db.query(Department).all()
                for d in all_depts:
                    db.add(CourseDepartment(course_id=course_id, department_id=d.id))
            elif dept_ids:
                db_course.department_id = dept_ids[0]
                for d_id in dept_ids:
                    db.add(CourseDepartment(course_id=course_id, department_id=d_id))
            else:
                db_course.department_id = None
                all_depts = db.query(Department).all()
                for d in all_depts:
                    db.add(CourseDepartment(course_id=course_id, department_id=d.id))
            db.commit()
        elif request.department_id is not None and request.department_id != db_course.department_id:
            dept_changed = True
            dept = db.query(Department).filter(Department.id == request.department_id).first()
            if not dept:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Department with ID {request.department_id} not found."
                )
            db_course.department_id = request.department_id
            db.query(CourseDepartment).filter(CourseDepartment.course_id == course_id).delete()
            db.add(CourseDepartment(course_id=course_id, department_id=request.department_id))
            db.commit()

        fields_set = getattr(request, "model_fields_set", set())
        deadline_changed = False

        if request.title is not None:
            db_course.title = request.title
        if request.description is not None:
            db_course.description = request.description
        if request.difficulty_level is not None:
            db_course.difficulty_level = request.difficulty_level
        if "duration" in fields_set or request.duration is not None:
            if db_course.duration != request.duration:
                deadline_changed = True
            db_course.duration = request.duration
        if "start_date" in fields_set or request.start_date is not None:
            if db_course.start_date != request.start_date:
                deadline_changed = True
            db_course.start_date = request.start_date
        if "end_date" in fields_set or request.end_date is not None:
            if db_course.end_date != request.end_date:
                deadline_changed = True
            db_course.end_date = request.end_date
        if request.priority is not None:
            db_course.priority = request.priority
        if request.is_mandatory is not None:
            db_course.is_mandatory = request.is_mandatory
        if request.video_url is not None:
            db_course.video_url = request.video_url.strip() if request.video_url else None

        # Check if we are publishing
        will_publish = False
        if request.is_published is True and not db_course.is_published:
            will_publish = True
        if request.status is not None:
            status_val = request.status.value if hasattr(request.status, 'value') else request.status
            if status_val == "published" and db_course.status != "published":
                will_publish = True

        if will_publish:
            db_course.published_at = datetime.now(timezone.utc)
            db_course.is_published = True
            db_course.status = "published"
        else:
            if request.is_published is not None:
                db_course.is_published = request.is_published
            if request.status is not None:
                db_course.status = request.status.value if hasattr(request.status, 'value') else request.status

        if request.priority is not None:
            db_course.priority = request.priority

        # Handle module assignments if provided
        if request.assigned_module_ids is not None:
            db.query(CourseModuleAssociation).filter(CourseModuleAssociation.course_id == course_id).delete()
            for idx, mod_id in enumerate(request.assigned_module_ids):
                mod = db.query(CourseModule).filter(CourseModule.id == mod_id).first()
                if mod:
                    db.add(CourseModuleAssociation(
                        course_id=course_id,
                        module_id=mod_id,
                        sequence_no=idx + 1
                    ))
                    if not mod.course_id:
                        mod.course_id = course_id

        db.commit()
        db.refresh(db_course)

        # Sync existing enrollments' deadlines if Admin updated start_date/end_date/duration
        if deadline_changed:
            from app.services.enrollment_service import compute_course_deadline
            now_utc = datetime.now(timezone.utc)
            active_enrs = db.query(CourseEnrollment).filter(
                CourseEnrollment.course_id == course_id,
                CourseEnrollment.status != "completed"
            ).all()
            for enr in active_enrs:
                new_exp = compute_course_deadline(db_course, enrolled_at=enr.enrolled_at)
                enr.expires_at = new_exp
                if new_exp is None or new_exp > now_utc:
                    enr.is_locked = False
                    if enr.status == "dropped":
                        enr.status = "in_progress" if (enr.progress_percent or 0) > 0 else "enrolled"
            db.commit()

        # If department was changed or course published or mandatory while published, sync enrollments
        if db_course.is_published and (dept_changed or will_publish or db_course.is_mandatory):
            from app.services.enrollment_service import EnrollmentService
            EnrollmentService.assign_course_to_departments(db, course_id)

        return db_course

    @staticmethod
    def get_course(db: Session, course_id: UUID) -> Course:
        db_course = db.query(Course).filter(Course.id == course_id).first()
        if not db_course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course with ID {course_id} not found."
            )
        return db_course

    @staticmethod
    def _dept_course_filter(db: Session, department_id: Optional[UUID]):
        """SQLAlchemy filter matching courses assigned to a specific department or all departments."""
        if department_id is None:
            return Course.department_id.is_(None)
        dept_course_ids = [
            r[0] for r in db.query(CourseDepartment.course_id).filter(
                CourseDepartment.department_id == department_id
            ).all()
        ]
        filters = [
            Course.department_id == department_id,
            Course.department_id.is_(None)
        ]
        if dept_course_ids:
            filters.append(Course.id.in_(dept_course_ids))
        return or_(*filters)

    @staticmethod
    def _build_courses_query(db: Session, current_user: User, status_filter: Optional[str] = None):
        """Build scoped course query for list_courses and total count."""
        query = db.query(Course)
        roles = [r.name for r in current_user.roles]
        is_global_admin = any(r in roles for r in ["ADMIN", "SYSTEM_ADMIN", "HR_ADMIN"]) or (current_user.department and current_user.department.code in ["HR", "HR_ADMIN"])
        is_manager = any(r in roles for r in ["MANAGER", "COURSE_MANAGER"])

        if not is_global_admin:
            dept_filter = CourseService._dept_course_filter(db, current_user.department_id)
            if is_manager:
                query = query.filter(
                    or_(
                        Course.created_by == current_user.id,
                        and_(Course.status == "pending", dept_filter),
                        and_(
                            Course.is_published == True,
                            Course.status.in_(["approved", "published"]),
                            dept_filter
                        )
                    )
                )
            else:
                query = query.filter(
                    or_(
                        Course.created_by == current_user.id,
                        and_(
                            Course.is_published == True,
                            Course.status.in_(["approved", "published"]),
                            dept_filter
                        )
                    )
                )

        if status_filter:
            query = query.filter(Course.status == status_filter)
        return query

    @staticmethod
    def list_courses(
        db: Session, 
        current_user: User,
        skip: int = 0, 
        limit: int = 100, 
        status_filter: Optional[str] = None
    ) -> List[Course]:
        query = CourseService._build_courses_query(db, current_user=current_user, status_filter=status_filter)
        return query.order_by(Course.created_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def count_courses(
        db: Session,
        current_user: User,
        status_filter: Optional[str] = None
    ) -> int:
        query = CourseService._build_courses_query(db, current_user=current_user, status_filter=status_filter)
        return query.count()

    @staticmethod
    def publish_course(db: Session, course_id: UUID) -> Course:
        db_course = db.query(Course).filter(Course.id == course_id).first()
        if not db_course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course with ID {course_id} not found."
            )
        if db_course.status not in ["draft", "approved", "published"] and not db_course.published_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Course must be approved before it can be published."
            )
        
        db_course.is_published = True
        db_course.status = "published"
        db_course.published_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(db_course)

        from app.services.enrollment_service import EnrollmentService
        EnrollmentService.assign_course_to_departments(db, db_course.id)

        return db_course

    @staticmethod
    def submit_for_approval(db: Session, course_id: UUID, user_id: UUID) -> CourseApproval:
        db_course = db.query(Course).filter(Course.id == course_id).first()
        if not db_course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course with ID {course_id} not found."
            )

        if db_course.status in ["pending", "approved"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Course is already {db_course.status}."
            )

        existing_approval = db.query(CourseApproval).filter(
            CourseApproval.course_id == course_id,
            CourseApproval.status == "pending"
        ).first()
        if existing_approval:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A pending approval request already exists for this course."
            )

        db_approval = CourseApproval(
            course_id=course_id,
            submitted_by=user_id,
            status="pending",
            submitted_at=datetime.now(timezone.utc)
        )
        db_course.status = "pending"
        
        db.add(db_approval)
        db.commit()
        db.refresh(db_approval)

        return db_approval

    @staticmethod
    def approve_course(db: Session, course_id: UUID, reviewer_id: UUID) -> CourseApproval:
        db_approval = db.query(CourseApproval).filter(
            CourseApproval.course_id == course_id,
            CourseApproval.status == "pending"
        ).first()
        if not db_approval:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pending approval request not found for this course."
            )

        db_course = db.query(Course).filter(Course.id == course_id).first()
        if db_course:
            db_course.status = "approved"

        db_approval.status = "approved"
        db_approval.reviewed_by = reviewer_id
        db_approval.reviewed_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(db_approval)

        from app.services.enrollment_service import EnrollmentService
        EnrollmentService.assign_course_to_departments(db, course_id)

        return db_approval

    @staticmethod
    def reject_course(
        db: Session, 
        course_id: UUID, 
        reviewer_id: UUID, 
        rejection_reason: str
    ) -> CourseApproval:
        db_approval = db.query(CourseApproval).filter(
            CourseApproval.course_id == course_id,
            CourseApproval.status == "pending"
        ).first()
        if not db_approval:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Pending approval request not found for this course."
            )

        db_course = db.query(Course).filter(Course.id == course_id).first()
        if db_course:
            db_course.status = "rejected"

        db_approval.status = "rejected"
        db_approval.reviewed_by = reviewer_id
        db_approval.reviewed_at = datetime.now(timezone.utc)
        db_approval.rejection_reason = rejection_reason

        db.commit()
        db.refresh(db_approval)

        return db_approval

    @staticmethod
    def delete_course(db: Session, course_id: UUID) -> None:
        db_course = db.query(Course).filter(Course.id == course_id).first()
        if not db_course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course with ID {course_id} not found."
            )

        from app.models.user_course_progress import UserCourseProgress
        from app.models.course_enrollment import CourseEnrollment
        from app.models.course_department import CourseDepartment
        from app.models.course_approval import CourseApproval
        from app.models.exam import Exam

        # 1. Clean up user progress for all enrollments in this course
        enr_ids = [e.id for e in db.query(CourseEnrollment.id).filter(CourseEnrollment.course_id == course_id).all()]
        if enr_ids:
            db.query(UserCourseProgress).filter(UserCourseProgress.enrollment_id.in_(enr_ids)).delete(synchronize_session=False)

        # 2. Clean up enrollments and assignments
        db.query(CourseEnrollment).filter(CourseEnrollment.course_id == course_id).delete(synchronize_session=False)
        db.query(CourseDepartment).filter(CourseDepartment.course_id == course_id).delete(synchronize_session=False)
        db.query(CourseApproval).filter(CourseApproval.course_id == course_id).delete(synchronize_session=False)

        # 3. Disassociate any exams tied to this course
        db.query(Exam).filter(Exam.course_id == course_id).update({Exam.course_id: None}, synchronize_session=False)

        # 4. Check and handle shared modules
        assocs = db.query(CourseModuleAssociation).filter(CourseModuleAssociation.course_id == course_id).all()
        for assoc in assocs:
            other_count = db.query(CourseModuleAssociation).filter(
                CourseModuleAssociation.module_id == assoc.module_id,
                CourseModuleAssociation.course_id != course_id
            ).count()
            if other_count > 0:
                # Module is shared with another course! Preserve it
                mod = db.query(CourseModule).filter(CourseModule.id == assoc.module_id).first()
                if mod and mod.course_id == course_id:
                    other_assoc = db.query(CourseModuleAssociation).filter(
                        CourseModuleAssociation.module_id == assoc.module_id,
                        CourseModuleAssociation.course_id != course_id
                    ).first()
                    mod.course_id = other_assoc.course_id if other_assoc else None
            else:
                # Module is exclusive to this course; delete module with cascade
                mod = db.query(CourseModule).filter(CourseModule.id == assoc.module_id).first()
                if mod:
                    db.delete(mod)
            db.delete(assoc)

        # Delete any remaining modules directly referencing course_id
        remaining_modules = db.query(CourseModule).filter(CourseModule.course_id == course_id).all()
        for m in remaining_modules:
            db.query(CourseModuleAssociation).filter(CourseModuleAssociation.module_id == m.id).delete(synchronize_session=False)
            db.delete(m)

        db.delete(db_course)
        db.commit()

    @staticmethod
    def get_course_learners(db: Session, course_id: UUID) -> List[dict]:
        db_course = db.query(Course).filter(Course.id == course_id).first()
        if not db_course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course with ID {course_id} not found."
            )

        from app.models.course_enrollment import CourseEnrollment
        from app.models.user_course_progress import UserCourseProgress

        enrollments = db.query(CourseEnrollment).join(
            User, CourseEnrollment.user_id == User.id
        ).filter(
            CourseEnrollment.course_id == course_id
        ).order_by(CourseEnrollment.enrolled_at.desc()).all()

        results = []
        for enr in enrollments:
            u = enr.user
            dept_name = u.department.name if u.department else "General"
            
            progress_records = db.query(UserCourseProgress).filter(
                UserCourseProgress.enrollment_id == enr.id
            ).all()
            total_time = sum(p.time_spent_seconds for p in progress_records)

            results.append({
                "user_id": u.id,
                "enrollment_id": enr.id,
                "employee_code": u.employee_code or "EMP",
                "name": f"{u.first_name} {u.last_name}".strip(),
                "email": u.email,
                "department_name": dept_name,
                "status": enr.status,
                "progress_percent": enr.progress_percent,
                "time_spent_seconds": total_time,
                "enrolled_at": enr.enrolled_at,
                "completed_at": enr.completed_at,
                "last_accessed_at": enr.last_accessed_at,
            })
        return results

    @staticmethod
    def _parse_duration_minutes(d_str: Optional[str]) -> int:
        if not d_str:
            return 0
        s = d_str.strip().lower()
        total = 0
        h_match = re.search(r'(\d+)\s*(?:h|hr|hour)', s)
        if h_match:
            total += int(h_match.group(1)) * 60
        m_match = re.search(r'(\d+)\s*(?:m|min)', s)
        if m_match:
            total += int(m_match.group(1))
        if not h_match and not m_match:
            digits = re.search(r'(\d+)', s)
            if digits:
                total = int(digits.group(1)) * 60
        return total

    @staticmethod
    def _format_duration(d_str: Optional[str]) -> str:
        if not d_str:
            return "Self-paced"
        mins = CourseService._parse_duration_minutes(d_str)
        if mins == 0:
            return d_str
        hours = mins // 60
        remaining_mins = mins % 60
        if hours > 0 and remaining_mins > 0:
            return f"{hours} hr{'s' if hours != 1 else ''} {remaining_mins} min{'s' if remaining_mins != 1 else ''}"
        elif hours > 0:
            return f"{hours} hr{'s' if hours != 1 else ''}"
        return f"{remaining_mins} mins"

    @staticmethod
    def _get_course_modules(db: Session, course_id: UUID) -> List[CourseModule]:
        try:
            assoc_ids = [r[0] for r in db.query(CourseModuleAssociation.module_id).filter(CourseModuleAssociation.course_id == course_id).all()]
            filters = [CourseModule.course_id == course_id]
            if assoc_ids:
                filters.append(CourseModule.id.in_(assoc_ids))
            modules = db.query(CourseModule).filter(or_(*filters)).order_by(CourseModule.sequence_no.asc()).all()
        except Exception:
            try:
                db.rollback()
            except Exception:
                pass
            modules = db.query(CourseModule).filter(CourseModule.course_id == course_id).order_by(CourseModule.sequence_no.asc()).all()

        seen = set()
        unique_mods = []
        for m in modules:
            if m.id not in seen:
                seen.add(m.id)
                unique_mods.append(m)
        return unique_mods

    @staticmethod
    def get_my_courses(db: Session, current_user: User) -> MyCoursesResponse:
        from app.services.enrollment_service import EnrollmentService
        # Ensure user is enrolled in applicable mandatory & department courses
        EnrollmentService.auto_enroll_user_in_mandatory_courses(db, current_user.id)

        enrollments = db.query(CourseEnrollment).join(
            Course, CourseEnrollment.course_id == Course.id
        ).filter(
            CourseEnrollment.user_id == current_user.id,
            or_(CourseEnrollment.status != "dropped", CourseEnrollment.is_locked == True),
            Course.is_published == True,
            Course.status.in_(["published", "approved"])
        ).all()

        items: List[MyCourseItem] = []
        total_assigned_count = 0
        not_started_count = 0
        in_progress_count = 0
        completed_count = 0

        now_utc = datetime.now(timezone.utc)
        lock_updated = False
        for enr in enrollments:
            course = enr.course
            if not course:
                continue
            if not enr.is_locked and enr.expires_at and enr.status != "completed":
                exp_utc = enr.expires_at.replace(tzinfo=timezone.utc) if enr.expires_at.tzinfo is None else enr.expires_at
                if now_utc > exp_utc:
                    enr.is_locked = True
                    lock_updated = True
        if lock_updated:
            db.commit()

        for enr in enrollments:
            course = enr.course
            if not course:
                continue

            modules = CourseService._get_course_modules(db, course.id)
            total_mods = len(modules)
            completed_mods_count = 0
            next_mod_id = None
            next_mod_title = None

            for mod in modules:
                contents = db.query(ModuleContent).filter(
                    ModuleContent.module_id == mod.id,
                    ModuleContent.is_active == True,
                    ModuleContent.content_type.notin_(["title", "subtitle"])
                ).all()
                is_mod_completed = False
                if enr.status == "completed" or (enr.progress_percent or 0) >= 100:
                    is_mod_completed = True
                elif contents:
                    c_ids = [c.id for c in contents]
                    done_count = db.query(UserCourseProgress).filter(
                        UserCourseProgress.enrollment_id == enr.id,
                        UserCourseProgress.content_id.in_(c_ids),
                        UserCourseProgress.completed == True
                    ).count()
                    if done_count >= len(contents):
                        is_mod_completed = True
                else:
                    if (enr.progress_percent or 0) >= 100 or enr.status == "completed":
                        is_mod_completed = True

                if is_mod_completed:
                    completed_mods_count += 1
                elif next_mod_id is None:
                    next_mod_id = mod.id
                    next_mod_title = mod.title

            if next_mod_id is None and modules:
                next_mod_id = modules[0].id
                next_mod_title = modules[0].title

            # Accurate progress percentage calculation
            progress_pct = 100 if enr.status == "completed" else (enr.progress_percent or 0)
            if total_mods > 0 and completed_mods_count == total_mods and progress_pct < 100:
                progress_pct = 100
                enr.progress_percent = 100
                enr.status = "completed"

            # Determine course card status
            if progress_pct >= 100 or enr.status == "completed":
                card_status = "completed"
                completed_count += 1
            elif progress_pct > 0 or enr.last_accessed_at is not None:
                card_status = "in_progress"
                in_progress_count += 1
            else:
                card_status = "not_started"
                not_started_count += 1

            # Check if assigned
            is_assigned = (
                course.department_id is None or
                course.department_id == current_user.department_id or
                (current_user.department_id and current_user.department_id in [da.department_id for da in course.department_associations]) or
                enr.enrolled_by is not None
            )
            if is_assigned:
                total_assigned_count += 1

            items.append(MyCourseItem(
                id=course.id,
                enrollment_id=enr.id,
                course_code=course.course_code,
                title=course.title,
                description=course.description,
                duration=CourseService._format_duration(course.duration),
                difficulty_level=course.difficulty_level or "All Levels",
                department_name=course.department_name,
                department_id=course.department_id,
                is_mandatory=bool(course.is_mandatory) if course.is_mandatory is not None else False,
                total_modules=total_mods,
                completed_modules=completed_mods_count,
                progress_percent=int(progress_pct),
                status=card_status,
                enrolled_at=enr.enrolled_at or datetime.now(timezone.utc),
                last_accessed_at=enr.last_accessed_at,
                completed_at=enr.completed_at,
                expires_at=enr.expires_at,
                start_date=course.start_date,
                end_date=course.end_date,
                is_locked=bool(enr.is_locked),
                next_module_id=next_mod_id,
                next_module_title=next_mod_title
            ))

        # Sort: In-progress courses by most recently accessed (fallback enrolled_at)
        def sort_key(item: MyCourseItem):
            def to_ts(dt):
                if dt is None:
                    return 0.0
                return dt.timestamp() if hasattr(dt, "timestamp") else 0.0

            if item.status == "in_progress":
                ts = item.last_accessed_at or item.enrolled_at
                return (0, -to_ts(ts))
            elif item.status == "not_started":
                ts = item.enrolled_at
                return (1, -to_ts(ts))
            else:
                ts = item.completed_at or item.enrolled_at
                return (2, -to_ts(ts))

        items.sort(key=sort_key)

        summary = MyCoursesSummary(
            total_assigned=total_assigned_count,
            not_started=not_started_count,
            in_progress=in_progress_count,
            completed=completed_count,
            total_enrolled=len(items)
        )
        return MyCoursesResponse(courses=items, summary=summary)

    @staticmethod
    def get_catalog(
        db: Session,
        current_user: User,
        search: Optional[str] = None,
        category: Optional[str] = None,
        duration: Optional[str] = None,
        status: Optional[str] = None,
        sort: Optional[str] = "newest",
        skip: int = 0,
        limit: int = 50
    ) -> CatalogResponse:
        from app.services.enrollment_service import EnrollmentService
        EnrollmentService.auto_enroll_user_in_mandatory_courses(db, current_user.id)

        roles = [r.name for r in current_user.roles]
        is_global_admin = any(r in roles for r in ["ADMIN", "SYSTEM_ADMIN", "HR_ADMIN"]) or (current_user.department and current_user.department.code in ["HR", "HR_ADMIN"])

        course_query = db.query(Course).filter(
            Course.is_published == True,
            Course.status.in_(["approved", "published"])
        )

        if not is_global_admin:
            course_query = course_query.filter(CourseService._dept_course_filter(db, current_user.department_id))

        courses = course_query.all()

        # Collect distinct categories
        cats_set = set()
        for c in courses:
            if c.department_name:
                cats_set.add(c.department_name)
        categories = sorted(list(cats_set))

        # User enrollments map
        user_enrollments = {
            e.course_id: e for e in db.query(CourseEnrollment).filter(
                CourseEnrollment.user_id == current_user.id,
                or_(CourseEnrollment.status != "dropped", CourseEnrollment.is_locked == True)
            ).all()
        }

        user_dept_id = current_user.department_id

        catalog_items: List[CatalogCourseItem] = []
        for c in courses:
            modules = CourseService._get_course_modules(db, c.id)
            total_mods = len(modules)

            is_assigned = (
                c.department_id is None or
                c.department_id == user_dept_id or
                (user_dept_id and user_dept_id in [da.department_id for da in c.department_associations])
            )

            enr = user_enrollments.get(c.id)
            if enr:
                if enr.progress_percent >= 100 or enr.status == "completed":
                    u_status = "completed"
                elif enr.progress_percent > 0 or enr.last_accessed_at is not None:
                    u_status = "in_progress"
                elif is_assigned or enr.enrolled_by is not None:
                    u_status = "assigned"
                else:
                    u_status = "not_started"
            else:
                if is_assigned:
                    u_status = "assigned"
                else:
                    u_status = "not_enrolled"

            catalog_items.append(CatalogCourseItem(
                id=c.id,
                course_code=c.course_code,
                title=c.title,
                description=c.description,
                duration=CourseService._format_duration(c.duration),
                difficulty_level=c.difficulty_level or "All Levels",
                department_name=c.department_name,
                department_id=c.department_id,
                is_mandatory=bool(c.is_mandatory) if c.is_mandatory is not None else False,
                is_published=bool(c.is_published) if c.is_published is not None else True,
                created_at=c.created_at or datetime.now(timezone.utc),
                total_modules=total_mods,
                enrollment_id=enr.id if enr else None,
                user_status=u_status,
                progress_percent=int(enr.progress_percent or 0) if enr else 0,
                last_accessed_at=enr.last_accessed_at if enr else None,
                start_date=c.start_date,
                end_date=c.end_date,
                is_locked=bool(enr.is_locked) if enr else False,
                creator_name=c.creator_name,
                created_by=c.created_by,
                can_delete=can_user_delete_course(c, current_user),
                can_edit=can_user_edit_course(c, current_user)
            ))

        # Filter by Search
        filtered = catalog_items
        if search and search.strip():
            s = search.strip().lower()
            filtered = [
                item for item in filtered
                if (item.title and s in item.title.lower()) or
                   (item.description and s in item.description.lower()) or
                   (item.course_code and s in item.course_code.lower())
            ]

        # Filter by Category / Department
        if category and category.strip().upper() != "ALL":
            cat_lower = category.strip().lower()
            filtered = [
                item for item in filtered
                if item.department_name and (
                    item.department_name.lower() == cat_lower or
                    cat_lower in [p.strip().lower() for p in item.department_name.split(",")] or
                    (cat_lower in ["all departments", "company-wide", "general"] and item.department_name.lower() in ["all departments", "company-wide", "general"])
                )
            ]

        # Filter by Duration
        if duration and duration.strip().upper() != "ALL":
            dur_key = duration.strip().lower()
            def match_duration(item: CatalogCourseItem) -> bool:
                mins = CourseService._parse_duration_minutes(item.duration)
                if dur_key == "short":
                    return mins <= 120
                elif dur_key == "medium":
                    return 120 < mins <= 600
                elif dur_key == "long":
                    return mins > 600
                return True
            filtered = [item for item in filtered if match_duration(item)]

        # Filter by User Status
        if status and status.strip().upper() != "ALL":
            st_key = status.strip().lower()
            def match_status(item: CatalogCourseItem) -> bool:
                if st_key == "assigned":
                    return item.user_status in ["assigned", "not_started"]
                elif st_key == "not_enrolled":
                    return item.user_status == "not_enrolled"
                elif st_key == "in_progress":
                    return item.user_status == "in_progress"
                elif st_key == "completed":
                    return item.user_status == "completed"
                return item.user_status == st_key
            filtered = [item for item in filtered if match_status(item)]

        # Sorting
        sort_mode = (sort or "newest").lower()
        if sort_mode == "a_to_z" or sort_mode == "title_asc":
            filtered.sort(key=lambda x: (x.title or "").lower())
        elif sort_mode == "z_to_a" or sort_mode == "title_desc":
            filtered.sort(key=lambda x: (x.title or "").lower(), reverse=True)
        elif sort_mode == "shortest_duration" or sort_mode == "duration_asc":
            filtered.sort(key=lambda x: CourseService._parse_duration_minutes(x.duration))
        elif sort_mode == "longest_duration" or sort_mode == "duration_desc":
            filtered.sort(key=lambda x: CourseService._parse_duration_minutes(x.duration), reverse=True)
        else: # newest
            def get_cat_ts(x):
                dt = getattr(x, "created_at", None)
                return dt.timestamp() if (dt and hasattr(dt, "timestamp")) else 0.0
            filtered.sort(key=get_cat_ts, reverse=True)

        total_count = len(filtered)
        paged_items = filtered[skip : skip + limit]

        page_num = (skip // limit) + 1 if limit > 0 else 1
        return CatalogResponse(
            courses=paged_items,
            total=total_count,
            page=page_num,
            page_size=limit,
            categories=categories
        )

    @staticmethod
    def enroll_course(db: Session, course_id: UUID, current_user: User) -> CourseEnrollment:
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Course with ID {course_id} not found.")
        if not (course.is_published and course.status in ["approved", "published"]):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot enroll in an unpublished course.")

        enr = db.query(CourseEnrollment).filter(
            CourseEnrollment.user_id == current_user.id,
            CourseEnrollment.course_id == course_id
        ).first()

        if enr:
            if enr.status == "dropped" and not enr.is_locked:
                now = datetime.now(timezone.utc)
                from app.services.enrollment_service import compute_course_deadline
                enr.status = "enrolled"
                enr.enrolled_at = now
                enr.expires_at = compute_course_deadline(course, enrolled_at=now)
                db.commit()
                db.refresh(enr)
            return enr

        from app.services.enrollment_service import compute_course_deadline
        now = datetime.now(timezone.utc)
        expires_at = compute_course_deadline(course, enrolled_at=now)

        new_enr = CourseEnrollment(
            user_id=current_user.id,
            course_id=course_id,
            enrolled_by=None,
            status="enrolled",
            progress_percent=0,
            enrolled_at=now,
            expires_at=expires_at,
            is_locked=False
        )
        db.add(new_enr)
        db.commit()
        db.refresh(new_enr)
        return new_enr

    @staticmethod
    def get_course_detail(db: Session, course_id: UUID, current_user: User) -> CourseDetailResponse:
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Course with ID {course_id} not found.")

        modules = CourseService._get_course_modules(db, course.id)
        enr = db.query(CourseEnrollment).filter(
            CourseEnrollment.user_id == current_user.id,
            CourseEnrollment.course_id == course_id
        ).first()

        detail_modules = []
        for m in modules:
            contents = db.query(ModuleContent).filter(
                ModuleContent.module_id == m.id,
                ModuleContent.is_active == True,
                ModuleContent.content_type.notin_(["title", "subtitle"])
            ).all()
            completed = False
            if enr:
                if enr.status == "completed" or (enr.progress_percent or 0) >= 100:
                    completed = True
                elif contents:
                    c_ids = [c.id for c in contents]
                    done_count = db.query(UserCourseProgress).filter(
                        UserCourseProgress.enrollment_id == enr.id,
                        UserCourseProgress.content_id.in_(c_ids),
                        UserCourseProgress.completed == True
                    ).count()
                    if done_count >= len(contents):
                        completed = True
                elif (enr.progress_percent or 0) >= 100 or enr.status == 'completed':
                    completed = True

            dur_secs = sum(c.duration_seconds or 0 for c in contents)
            detail_modules.append(CourseDetailModule(
                id=m.id,
                title=m.title,
                description=m.description,
                sequence_no=m.sequence_no,
                tier=m.tier or "all_levels",
                contents_count=len(contents),
                duration_seconds=dur_secs,
                completed=completed
            ))

        user_dept_id = current_user.department_id
        is_assigned = (
            course.department_id is None or
            course.department_id == user_dept_id or
            (user_dept_id and user_dept_id in [da.department_id for da in course.department_associations])
        )

        if enr:
            if enr.progress_percent >= 100 or enr.status == 'completed':
                u_status = "completed"
            elif enr.progress_percent > 0 or enr.last_accessed_at is not None:
                u_status = "in_progress"
            elif is_assigned or enr.enrolled_by is not None:
                u_status = "assigned"
            else:
                u_status = "not_started"
        else:
            u_status = "assigned" if is_assigned else "not_enrolled"

        return CourseDetailResponse(
            id=course.id,
            course_code=course.course_code,
            title=course.title,
            description=course.description,
            duration=CourseService._format_duration(course.duration),
            difficulty_level=course.difficulty_level or "All Levels",
            department_name=course.department_name,
            department_id=course.department_id,
            is_mandatory=course.is_mandatory,
            video_url=course.video_url,
            created_at=course.created_at,
            creator_name=course.creator_name,
            created_by=course.created_by,
            total_modules=len(detail_modules),
            enrollment_id=enr.id if enr else None,
            user_status=u_status,
            progress_percent=enr.progress_percent if enr else 0,
            last_accessed_at=enr.last_accessed_at if enr else None,
            completed_at=enr.completed_at if enr else None,
            expires_at=enr.expires_at if enr else None,
            start_date=course.start_date,
            end_date=course.end_date,
            is_locked=bool(enr.is_locked) if enr else False,
            modules=detail_modules,
            can_delete=can_user_delete_course(course, current_user),
            can_edit=can_user_edit_course(course, current_user)
        )

