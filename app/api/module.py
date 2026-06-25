from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from app.core.dependencies import get_db, get_current_user, RequireRoles
from app.models.user import User
from app.models.course_module import CourseModule
from app.schemas.course import (
    ModuleCreate, ModuleUpdate, ModuleResponse, ModuleListResponse,
    ModuleContentCreate, ModuleContentResponse, ModuleContentUpdate
)
from app.services.module_service import ModuleService

router = APIRouter(tags=["Modules"])

@router.post(
    "/api/modules",
    response_model=ModuleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Module",
    description="Create a new course module. Restricted to Admins and Managers."
)
def create_module(
    request: ModuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("ADMIN", "MANAGER"))
):
    return ModuleService.create_module(db, request=request)

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
    description="Update module details. Restricted to Admins and Managers."
)
def update_module(
    module_id: UUID,
    request: ModuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("ADMIN", "MANAGER"))
):
    return ModuleService.update_module(db, module_id=module_id, request=request)

@router.delete(
    "/api/modules/{module_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Module",
    description="Delete a module and its contents. Restricted to Admins and Managers."
)
def delete_module(
    module_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("ADMIN", "MANAGER"))
):
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
    description="Create a new learning content item for a module. Restricted to Admins and Managers."
)
def create_content(
    module_id: UUID,
    request: ModuleContentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("ADMIN", "MANAGER"))
):
    return ModuleService.create_content(db, module_id=module_id, request=request)

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
    description="Update a learning content item. Restricted to Admins and Managers."
)
def update_content(
    content_id: UUID,
    request: ModuleContentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("ADMIN", "MANAGER"))
):
    return ModuleService.update_content(db, content_id=content_id, request=request)

@router.delete(
    "/api/contents/{content_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Content",
    description="Delete a learning content item. Restricted to Admins and Managers."
)
def delete_content(
    content_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("ADMIN", "MANAGER"))
):
    ModuleService.delete_content(db, content_id=content_id)
    return None
