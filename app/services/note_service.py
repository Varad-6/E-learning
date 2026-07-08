from sqlalchemy.orm import Session
from uuid import UUID
from fastapi import HTTPException, status
from app.models.user_module_note import UserModuleNote
from app.models.course_module import CourseModule

class NoteService:
    @staticmethod
    def get_note(db: Session, user_id: UUID, module_id: UUID) -> UserModuleNote:
        module = db.query(CourseModule).filter(CourseModule.id == module_id).first()
        if not module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Module with ID {module_id} not found."
            )
        
        note = db.query(UserModuleNote).filter(
            UserModuleNote.user_id == user_id,
            UserModuleNote.module_id == module_id
        ).first()
        if not note:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Note not found for this module."
            )
        return note

    @staticmethod
    def save_note(db: Session, user_id: UUID, module_id: UUID, content: str) -> UserModuleNote:
        module = db.query(CourseModule).filter(CourseModule.id == module_id).first()
        if not module:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Module with ID {module_id} not found."
            )

        note = db.query(UserModuleNote).filter(
            UserModuleNote.user_id == user_id,
            UserModuleNote.module_id == module_id
        ).first()

        if note:
            note.content = content
        else:
            note = UserModuleNote(
                user_id=user_id,
                module_id=module_id,
                content=content
            )
            db.add(note)
        
        db.commit()
        db.refresh(note)
        return note
