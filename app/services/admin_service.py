from typing import List
from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User
from app.models.role import Role
from app.models.department import Department
from app.schemas.admin import UserCreate, UserUpdate, RoleAssignmentRequest
from app.core.security import get_password_hash

class AdminService:
    @staticmethod
    def create_user(db: Session, request: UserCreate) -> User:
        existing_code = db.query(User).filter(User.employee_code == request.employee_code).first()
        if existing_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Employee code '{request.employee_code}' already exists."
            )

        existing_email = db.query(User).filter(User.email == request.email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email '{request.email}' already exists."
            )

        if request.department_id:
            dept = db.query(Department).filter(Department.id == request.department_id).first()
            if not dept:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Department with ID {request.department_id} not found."
                )

        roles_list = []
        if request.roles:
            for r_name in request.roles:
                role = db.query(Role).filter(Role.name == r_name.upper()).first()
                if not role:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Role '{r_name}' does not exist."
                    )
                roles_list.append(role)

        password_hash = get_password_hash(request.password)

        user = User(
            employee_code=request.employee_code,
            first_name=request.first_name,
            last_name=request.last_name,
            email=request.email,
            password_hash=password_hash,
            department_id=request.department_id,
            is_active=True,
            is_deleted=False,
            must_change_password=True,
            roles=roles_list
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def update_user(db: Session, user_id: UUID, request: UserUpdate) -> User:
        user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found."
            )

        if request.email and request.email != user.email:
            existing = db.query(User).filter(User.email == request.email).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Email '{request.email}' already exists."
                )
            user.email = request.email

        if request.department_id and request.department_id != user.department_id:
            dept = db.query(Department).filter(Department.id == request.department_id).first()
            if not dept:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Department with ID {request.department_id} not found."
                )
            user.department_id = request.department_id

        if request.first_name is not None:
            user.first_name = request.first_name
        if request.last_name is not None:
            user.last_name = request.last_name
        if request.is_active is not None:
            user.is_active = request.is_active
        if request.is_deleted is not None:
            user.is_deleted = request.is_deleted
        if request.must_change_password is not None:
            user.must_change_password = request.must_change_password

        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def assign_role(db: Session, request: RoleAssignmentRequest) -> User:
        user = db.query(User).filter(User.id == request.user_id, User.is_deleted == False).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {request.user_id} not found."
            )

        roles_list = []
        for r_name in request.roles:
            role = db.query(Role).filter(Role.name == r_name.upper()).first()
            if not role:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Role '{r_name}' does not exist."
                )
            roles_list.append(role)

        user.roles = roles_list
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def list_users(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
        return db.query(User).filter(User.is_deleted == False).offset(skip).limit(limit).all()
