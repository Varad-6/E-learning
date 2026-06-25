from typing import List
from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.course import Course
from app.models.course_module import CourseModule
from app.models.module_content import ModuleContent
from app.schemas.course import (
    ModuleCreate, ModuleUpdate, ModuleContentCreate, ModuleContentUpdate
)

class ModuleService:
    @staticmethod
    def create_module(db: Session, request: ModuleCreate) -> CourseModule:
        course = db.query(Course).filter(Course.id == request.course_id).first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course with ID {request.course_id} not found."
            )
        
        db_module = CourseModule(
            course_id=request.course_id,
            title=request.title,
            description=request.description,
            sequence_no=request.sequence_no
        )
        db.add(db_module)
        db.commit()
        db.refresh(db_module)
        return db_module

    @staticmethod
    def update_module(db: Session, module_id: UUID, request: ModuleUpdate) -> CourseModule:
        db_module = db.query(CourseModule).filter(CourseModule.id == module_id).first()
        if not db_module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Module with ID {module_id} not found."
            )
        
        if request.title is not None:
            db_module.title = request.title
        if request.description is not None:
            db_module.description = request.description
        if request.sequence_no is not None:
            db_module.sequence_no = request.sequence_no

        db.commit()
        db.refresh(db_module)
        return db_module

    @staticmethod
    def delete_module(db: Session, module_id: UUID) -> None:
        db_module = db.query(CourseModule).filter(CourseModule.id == module_id).first()
        if not db_module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Module with ID {module_id} not found."
            )
        db.delete(db_module)
        db.commit()

    @staticmethod
    def get_module(db: Session, module_id: UUID) -> CourseModule:
        db_module = db.query(CourseModule).filter(CourseModule.id == module_id).first()
        if not db_module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Module with ID {module_id} not found."
            )
        return db_module

    @staticmethod
    def list_modules(db: Session, skip: int = 0, limit: int = 100) -> List[CourseModule]:
        return db.query(CourseModule).offset(skip).limit(limit).all()

    @staticmethod
    def get_modules_by_course(db: Session, course_id: UUID) -> List[CourseModule]:
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Course with ID {course_id} not found."
            )
        return db.query(CourseModule).filter(CourseModule.course_id == course_id).order_by(CourseModule.sequence_no).all()

    @staticmethod
    def create_content(db: Session, module_id: UUID, request: ModuleContentCreate) -> ModuleContent:
        module = db.query(CourseModule).filter(CourseModule.id == module_id).first()
        if not module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Module with ID {module_id} not found."
            )
        
        db_content = ModuleContent(
            module_id=module_id,
            title=request.title,
            content_type=request.content_type,
            file_path=request.file_path,
            duration_seconds=request.duration_seconds,
            sequence_no=request.sequence_no,
            is_active=request.is_active
        )
        db.add(db_content)
        db.commit()
        db.refresh(db_content)
        return db_content

    @staticmethod
    def update_content(db: Session, content_id: UUID, request: ModuleContentUpdate) -> ModuleContent:
        db_content = db.query(ModuleContent).filter(ModuleContent.id == content_id).first()
        if not db_content:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Content with ID {content_id} not found."
            )

        if request.title is not None:
            db_content.title = request.title
        if request.content_type is not None:
            db_content.content_type = request.content_type
        if request.file_path is not None:
            db_content.file_path = request.file_path
        if request.duration_seconds is not None:
            db_content.duration_seconds = request.duration_seconds
        if request.sequence_no is not None:
            db_content.sequence_no = request.sequence_no
        if request.is_active is not None:
            db_content.is_active = request.is_active

        db.commit()
        db.refresh(db_content)
        return db_content

    @staticmethod
    def delete_content(db: Session, content_id: UUID) -> None:
        db_content = db.query(ModuleContent).filter(ModuleContent.id == content_id).first()
        if not db_content:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Content with ID {content_id} not found."
            )
        db.delete(db_content)
        db.commit()

    @staticmethod
    def get_content(db: Session, content_id: UUID) -> ModuleContent:
        db_content = db.query(ModuleContent).filter(ModuleContent.id == content_id).first()
        if not db_content:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Content with ID {content_id} not found."
            )
        return db_content

    @staticmethod
    def list_module_contents(db: Session, module_id: UUID) -> List[ModuleContent]:
        module = db.query(CourseModule).filter(CourseModule.id == module_id).first()
        if not module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Module with ID {module_id} not found."
            )
        return db.query(ModuleContent).filter(ModuleContent.module_id == module_id).order_by(ModuleContent.sequence_no).all()

    @staticmethod
    def validate_module_belongs_to_course(db: Session, module_id: UUID, course_id: UUID) -> None:
        module = db.query(CourseModule).filter(CourseModule.id == module_id).first()
        if not module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Module with ID {module_id} not found."
            )
        if module.course_id != course_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Module with ID {module_id} does not belong to course with ID {course_id}."
            )
