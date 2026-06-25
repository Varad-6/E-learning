from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.course import Course
from app.models.course_approval import CourseApproval
from app.models.department import Department
from app.models.user import User
from app.schemas.course import CourseCreate, CourseUpdate

class CourseService:
    @staticmethod
    def create_course(db: Session, request: CourseCreate, user_id: UUID) -> Course:
        existing_course = db.query(Course).filter(Course.course_code == request.course_code).first()
        if existing_course:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Course code '{request.course_code}' already exists."
            )

        if request.department_id:
            dept = db.query(Department).filter(Department.id == request.department_id).first()
            if not dept:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Department with ID {request.department_id} not found."
                )

        db_course = Course(
            course_code=request.course_code,
            title=request.title,
            description=request.description,
            difficulty_level=request.difficulty_level,
            department_id=request.department_id,
            created_by=user_id,
            status="draft",
            is_published=False
        )
        db.add(db_course)
        db.commit()
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

        if request.department_id and request.department_id != db_course.department_id:
            dept = db.query(Department).filter(Department.id == request.department_id).first()
            if not dept:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Department with ID {request.department_id} not found."
                )
            db_course.department_id = request.department_id

        if request.title is not None:
            db_course.title = request.title
        if request.description is not None:
            db_course.description = request.description
        if request.difficulty_level is not None:
            db_course.difficulty_level = request.difficulty_level
        if request.is_published is not None:
            db_course.is_published = request.is_published
        if request.status is not None:
            db_course.status = request.status.value if hasattr(request.status, 'value') else request.status

        db.commit()
        db.refresh(db_course)
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
    def list_courses(
        db: Session, 
        skip: int = 0, 
        limit: int = 100, 
        status_filter: Optional[str] = None
    ) -> List[Course]:
        query = db.query(Course)
        if status_filter:
            query = query.filter(Course.status == status_filter)
        return query.offset(skip).limit(limit).all()

    @staticmethod
    def publish_course(db: Session, course_id: UUID) -> Course:
        db_course = db.query(Course).filter(Course.id == course_id).first()
        if not db_course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course with ID {course_id} not found."
            )
        if db_course.status != "approved":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Course must be approved before it can be published."
            )
        db_course.is_published = True
        db.commit()
        db.refresh(db_course)
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
        db.delete(db_course)
        db.commit()

