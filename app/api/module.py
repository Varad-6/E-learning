from fastapi import APIRouter, Depends, status, HTTPException, UploadFile, File
import os
import uuid
import shutil
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List, Optional

from app.core.dependencies import (
    get_db, get_current_user, RequireRoles,
    can_user_edit_course, is_admin_user
)
from app.models.user import User
from app.models.course import Course
from app.models.course_module import CourseModule, CourseModuleAssociation
from app.models.module_content import ModuleContent
from app.schemas.course import (
    ModuleCreate, ModuleUpdate, ModuleResponse, ModuleListResponse,
    ModuleContentCreate, ModuleContentResponse, ModuleContentUpdate, ReorderRequest
)
from app.services.module_service import ModuleService
from app.schemas.note import UserModuleNoteCreate, UserModuleNoteResponse
from app.services.note_service import NoteService
from app.services.audit_service import AuditService

router = APIRouter(tags=["Modules"])

def get_parent_course_for_module(db: Session, module_id: UUID) -> Optional[Course]:
    """Find the parent Course associated with a module."""
    mod = db.query(CourseModule).filter(CourseModule.id == module_id).first()
    if not mod:
        return None
    if mod.course_id:
        return db.query(Course).filter(Course.id == mod.course_id).first()
    assoc = db.query(CourseModuleAssociation).filter(CourseModuleAssociation.module_id == module_id).first()
    if assoc:
        return db.query(Course).filter(Course.id == assoc.course_id).first()
    return None

def check_module_write_permission(db: Session, module_id: UUID, current_user: User):
    """
    Enforce ownership on modules:
    Only Admins or the creator of the course that owns the module can modify or delete it.
    """
    if is_admin_user(current_user):
        return
    course = get_parent_course_for_module(db, module_id)
    if course:
        if not can_user_edit_course(course, current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied: Only the course creator or an administrator can modify modules in this course."
            )
    else:
        if not is_admin_user(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied: Only administrators can modify standalone modules."
            )

@router.post(
    "/api/modules",
    response_model=ModuleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Module",
    description="Create a new course module. Restricted to Admins and the Course Creator."
)
def create_module(
    request: ModuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("SYSTEM_ADMIN", "HR_ADMIN", "COURSE_MANAGER"))
):
    if request.course_id:
        course = db.query(Course).filter(Course.id == request.course_id).first()
        if course and not can_user_edit_course(course, current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied: Only the course creator or an administrator can create modules in this course."
            )
    elif not is_admin_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied: Only administrators can create standalone modules."
        )
    module = ModuleService.create_module(db, request=request)
    AuditService.log_model_event(module, event_type="CREATE", performed_by=current_user.id)
    return module

@router.get(
    "/api/modules",
    response_model=ModuleListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Modules",
    description="Retrieve a paginated list of all modules."
)
def list_modules(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    modules = ModuleService.list_modules(db, skip=skip, limit=limit)
    total = db.query(CourseModule).count()
    return ModuleListResponse(modules=modules, total=total)

@router.get(
    "/api/modules/{module_id}",
    response_model=ModuleResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Module Detail",
    description="Retrieve details of a module by its ID."
)
def get_module(
    module_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return ModuleService.get_module(db, module_id=module_id)

@router.put(
    "/api/modules/{module_id}",
    response_model=ModuleResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Module",
    description="Update module details. Restricted to Admins and the Course Creator."
)
def update_module(
    module_id: UUID,
    request: ModuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_module_write_permission(db, module_id, current_user)
    module = ModuleService.update_module(db, module_id=module_id, request=request)
    AuditService.log_model_event(module, event_type="UPDATE", performed_by=current_user.id)
    return module

@router.delete(
    "/api/modules/{module_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Module",
    description="Delete a module and its contents. Restricted to Admins and the Course Creator."
)
def delete_module(
    module_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_module_write_permission(db, module_id, current_user)
    module = ModuleService.get_module(db, module_id=module_id)
    
    # Eager load relationships before deleting
    for rel_name in ["progress_records", "contents"]:
        if hasattr(module, rel_name):
            _ = getattr(module, rel_name)

    AuditService.log_model_event(module, event_type="DELETE", performed_by=current_user.id)
    ModuleService.delete_module(db, module_id=module_id)
    return None

@router.get(
    "/api/courses/{course_id}/modules",
    response_model=List[ModuleResponse],
    status_code=status.HTTP_200_OK,
    summary="Get Modules by Course",
    description="Retrieve all modules belonging to a specific course ordered by their sequence number."
)
def get_modules_by_course(
    course_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return ModuleService.get_modules_by_course(db, course_id=course_id)

@router.post(
    "/api/modules/{module_id}/contents",
    response_model=ModuleContentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Module Content",
    description="Create a new learning content item for a module. Restricted to Admins and the Course Creator."
)
def create_content(
    module_id: UUID,
    request: ModuleContentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_module_write_permission(db, module_id, current_user)
    return ModuleService.create_content(db, module_id=module_id, request=request)

@router.post(
    "/api/modules/{module_id}/upload",
    status_code=status.HTTP_201_CREATED,
    summary="Upload Module Media File",
    description="Upload a direct video or image file to be embedded into the course module."
)
async def upload_module_media(
    module_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    check_module_write_permission(db, module_id, current_user)
    ext = os.path.splitext(file.filename or "")[1].lower()
    allowed_exts = {
        ".mp4": "video", ".webm": "video", ".ogg": "video", ".mov": "video", ".m4v": "video",
        ".png": "image", ".jpg": "image", ".jpeg": "image", ".gif": "image", ".webp": "image", ".svg": "image",
        ".pdf": "document", ".docx": "document", ".pptx": "document"
    }
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{ext}'. Allowed formats: MP4, WebM, PNG, JPG, JPEG, GIF, WebP, PDF"
        )
    media_type = allowed_exts[ext]
    upload_dir = os.path.join("uploads", "courses", str(module_id))
    os.makedirs(upload_dir, exist_ok=True)
    clean_filename = f"{uuid.uuid4().hex[:12]}_{file.filename}"
    file_dest = os.path.join(upload_dir, clean_filename)
    with open(file_dest, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    web_path = f"/uploads/courses/{module_id}/{clean_filename}".replace("\\", "/")
    return {
        "file_path": web_path,
        "filename": file.filename,
        "content_type": media_type,
        "media_type": media_type
    }

@router.post(
    "/api/modules/upload-media",
    status_code=status.HTTP_201_CREATED,
    summary="Upload Direct Course Media File",
    description="Upload any course media file (video/image) directly."
)
async def upload_general_media(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("SYSTEM_ADMIN", "HR_ADMIN", "COURSE_MANAGER"))
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    allowed_exts = {
        ".mp4": "video", ".webm": "video", ".ogg": "video", ".mov": "video", ".m4v": "video",
        ".png": "image", ".jpg": "image", ".jpeg": "image", ".gif": "image", ".webp": "image", ".svg": "image",
        ".pdf": "document", ".docx": "document", ".pptx": "document"
    }
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{ext}'. Allowed formats: MP4, WebM, PNG, JPG, JPEG, GIF, WebP, PDF"
        )
    media_type = allowed_exts[ext]
    upload_dir = os.path.join("uploads", "media")
    os.makedirs(upload_dir, exist_ok=True)
    clean_filename = f"{uuid.uuid4().hex[:12]}_{file.filename}"
    file_dest = os.path.join(upload_dir, clean_filename)
    with open(file_dest, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    web_path = f"/uploads/media/{clean_filename}".replace("\\", "/")
    return {
        "file_path": web_path,
        "filename": file.filename,
        "content_type": media_type,
        "media_type": media_type
    }

@router.get(
    "/api/modules/{module_id}/contents",
    response_model=List[ModuleContentResponse],
    status_code=status.HTTP_200_OK,
    summary="Get Module Contents",
    description="Retrieve all contents for a specific module ordered by their sequence number."
)
def get_module_contents(
    module_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return ModuleService.list_module_contents(db, module_id=module_id)

@router.get(
    "/api/contents/{content_id}",
    response_model=ModuleContentResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Content Detail",
    description="Retrieve details of a learning content item."
)
def get_content(
    content_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return ModuleService.get_content(db, content_id=content_id)

@router.put(
    "/api/contents/{content_id}",
    response_model=ModuleContentResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Content",
    description="Update a learning content item. Restricted to Admins and the Course Creator."
)
def update_content(
    content_id: UUID,
    request: ModuleContentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cnt = db.query(ModuleContent).filter(ModuleContent.id == content_id).first()
    if not cnt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content item not found")
    check_module_write_permission(db, cnt.module_id, current_user)
    return ModuleService.update_content(db, content_id=content_id, request=request)

@router.delete(
    "/api/contents/{content_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Content",
    description="Delete a learning content item. Restricted to Admins and the Course Creator."
)
def delete_content(
    content_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cnt = db.query(ModuleContent).filter(ModuleContent.id == content_id).first()
    if not cnt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content item not found")
    check_module_write_permission(db, cnt.module_id, current_user)
    ModuleService.delete_content(db, content_id=content_id)
    return None

@router.put(
    "/api/modules/reorder",
    status_code=status.HTTP_200_OK,
    summary="Reorder Modules",
    description="Update the sequence number of multiple course modules. Restricted to Admins and the Course Creator."
)
def reorder_modules(
    request: ReorderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if request.items:
        check_module_write_permission(db, request.items[0].id, current_user)
    ModuleService.reorder_modules(db, items=request.items)
    return {"message": "Modules successfully reordered"}

@router.put(
    "/api/contents/reorder",
    status_code=status.HTTP_200_OK,
    summary="Reorder Module Contents",
    description="Update the sequence number of multiple learning content blocks. Restricted to Admins and the Course Creator."
)
def reorder_contents(
    request: ReorderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if request.items:
        cnt = db.query(ModuleContent).filter(ModuleContent.id == request.items[0].id).first()
        if cnt:
            check_module_write_permission(db, cnt.module_id, current_user)
    ModuleService.reorder_contents(db, items=request.items)
    return {"message": "Content blocks successfully reordered"}

@router.get(
    "/api/modules/{module_id}/notes",
    response_model=UserModuleNoteResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Module Note",
    description="Retrieve study notes of the current user for a specific module."
)
def get_module_note(
    module_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return NoteService.get_note(db, user_id=current_user.id, module_id=module_id)

@router.put(
    "/api/modules/{module_id}/notes",
    response_model=UserModuleNoteResponse,
    status_code=status.HTTP_200_OK,
    summary="Save Module Note",
    description="Create or update study notes of the current user for a specific module."
)
def save_module_note(
    module_id: UUID,
    request: UserModuleNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return NoteService.save_note(db, user_id=current_user.id, module_id=module_id, content=request.content)
