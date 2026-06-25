from typing import List
from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.department import Department
from app.schemas.department import DepartmentCreate, DepartmentUpdate

class DepartmentService:
    @staticmethod
    def create_department(db: Session, request: DepartmentCreate) -> Department:
        existing = db.query(Department).filter(Department.code == request.code).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Department code '{request.code}' already exists."
            )

        dept = Department(
            name=request.name,
            code=request.code,
            description=request.description
        )
        db.add(dept)
        db.commit()
        db.refresh(dept)
        return dept

    @staticmethod
    def update_department(db: Session, department_id: UUID, request: DepartmentUpdate) -> Department:
        dept = db.query(Department).filter(Department.id == department_id).first()
        if not dept:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Department with ID {department_id} not found."
            )

        if request.code and request.code != dept.code:
            existing = db.query(Department).filter(Department.code == request.code).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Department code '{request.code}' already exists."
                )
            dept.code = request.code

        if request.name is not None:
            dept.name = request.name
        if request.description is not None:
            dept.description = request.description

        db.commit()
        db.refresh(dept)
        return dept

    @staticmethod
    def get_department(db: Session, department_id: UUID) -> Department:
        dept = db.query(Department).filter(Department.id == department_id).first()
        if not dept:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Department with ID {department_id} not found."
            )
        return dept

    @staticmethod
    def list_departments(db: Session, skip: int = 0, limit: int = 100) -> List[Department]:
        return db.query(Department).offset(skip).limit(limit).all()

    @staticmethod
    def delete_department(db: Session, department_id: UUID) -> None:
        dept = db.query(Department).filter(Department.id == department_id).first()
        if not dept:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Department with ID {department_id} not found."
            )
        db.delete(dept)
        db.commit()

