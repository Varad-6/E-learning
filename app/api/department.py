from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from app.core.dependencies import get_db, get_current_user, RequireRoles
from app.models.user import User
from app.schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentResponse
from app.services.department_service import DepartmentService

router = APIRouter(prefix="/api/departments", tags=["Departments"])

@router.get(
    "",
    response_model=List[DepartmentResponse],
    status_code=status.HTTP_200_OK,
    summary="List Departments",
    description="Retrieve all departments."
)
def list_departments(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    return DepartmentService.list_departments(db, skip=skip, limit=limit)

@router.get(
    "/{department_id}",
    response_model=DepartmentResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Department",
    description="Retrieve a department by its ID."
)
def get_department(
    department_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return DepartmentService.get_department(db, department_id=department_id)

@router.post(
    "",
    response_model=DepartmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Department",
    description="Create a new department. Restricted to Admins."
)
def create_department(
    request: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("ADMIN"))
):
    return DepartmentService.create_department(db, request=request)

@router.put(
    "/{department_id}",
    response_model=DepartmentResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Department",
    description="Update department details. Restricted to Admins."
)
def update_department(
    department_id: UUID,
    request: DepartmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("ADMIN"))
):
    return DepartmentService.update_department(db, department_id=department_id, request=request)

@router.delete(
    "/{department_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Department",
    description="Delete a department. Restricted to Admins."
)
def delete_department(
    department_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(RequireRoles("ADMIN"))
):
    DepartmentService.delete_department(db, department_id=department_id)
    return None
