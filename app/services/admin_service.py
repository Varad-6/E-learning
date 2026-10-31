from typing import List, Optional
from uuid import UUID
import re
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.user import User
from app.models.role import Role
from app.models.department import Department
from app.models.otp import EmailVerificationOTP
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

        user_email = request.email
        if not user_email or not str(user_email).strip():
            clean_fn = re.sub(r'[^a-zA-Z0-9]', '', request.first_name.lower()) or "user"
            clean_ln = re.sub(r'[^a-zA-Z0-9]', '', request.last_name.lower()) or "emp"
            candidate_email = f"{clean_fn}.{clean_ln}@kaizen.com"
            existing = db.query(User).filter(User.email == candidate_email).first()
            if existing:
                clean_code = re.sub(r'[^a-zA-Z0-9]', '', request.employee_code.lower())
                candidate_email = f"{clean_fn}.{clean_ln}.{clean_code}@kaizen.com"
            user_email = candidate_email
        else:
            user_email = str(request.email).strip().lower()
            existing_email = db.query(User).filter(User.email == user_email).first()
            if existing_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Email '{user_email}' already exists."
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
            email=user_email,
            password_hash=password_hash,
            department_id=request.department_id,
            is_active=True,
            is_deleted=False,
            email_verified=True,
            must_change_password=True,
            roles=roles_list
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        from app.services.enrollment_service import EnrollmentService
        EnrollmentService.auto_enroll_user_in_mandatory_courses(db, user.id)

        return user

    @staticmethod
    def update_user(db: Session, user_id: UUID, request: UserUpdate) -> User:
        user = db.query(User).filter(User.id == user_id, User.is_deleted == False).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with ID {user_id} not found."
            )

        if request.employee_code and request.employee_code != user.employee_code:
            existing_code = db.query(User).filter(User.employee_code == request.employee_code, User.id != user.id).first()
            if existing_code:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Employee code '{request.employee_code}' already exists."
                )
            user.employee_code = request.employee_code

        if request.email and request.email != user.email:
            existing = db.query(User).filter(User.email == request.email, User.id != user.id).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Email '{request.email}' already exists."
                )
            user.email = request.email

        dept_changed = False
        if request.department_id is not None and request.department_id != user.department_id:
            dept = db.query(Department).filter(Department.id == request.department_id).first()
            if not dept:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Department with ID {request.department_id} not found."
                )
            user.department_id = request.department_id
            dept_changed = True

        if request.roles is not None:
            roles_list = []
            for r_name in request.roles:
                r_clean = r_name.strip().upper()
                role_obj = db.query(Role).filter(Role.name == r_clean).first()
                if role_obj:
                    roles_list.append(role_obj)
            if roles_list:
                user.roles = roles_list

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

        if dept_changed:
            from app.services.enrollment_service import EnrollmentService
            EnrollmentService.auto_enroll_user_in_mandatory_courses(db, user.id)

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

    @staticmethod
    def generate_employee_emails(db: Session, domain: str = "kaizen.com") -> List[dict]:
        """Automatically create/standardize corporate email IDs for all active employees."""
        users = db.query(User).filter(User.is_deleted == False).all()
        updated = []
        for user in users:
            # Check if email is missing or placeholder @lms.com
            needs_update = not user.email or user.email.endswith("@lms.com")
            if needs_update:
                clean_fn = re.sub(r'[^a-zA-Z0-9]', '', (user.first_name or '').lower()) or "emp"
                clean_ln = re.sub(r'[^a-zA-Z0-9]', '', (user.last_name or '').lower()) or "user"
                clean_code = re.sub(r'[^a-zA-Z0-9]', '', (user.employee_code or '').lower())
                candidate = f"{clean_fn}.{clean_ln}@{domain}"
                existing = db.query(User).filter(User.email == candidate, User.id != user.id).first()
                if existing:
                    candidate = f"{clean_fn}.{clean_ln}.{clean_code}@{domain}"
                old_email = user.email
                user.email = candidate
                user.email_verified = True
                updated.append({
                    "employee_code": user.employee_code,
                    "name": f"{user.first_name} {user.last_name}",
                    "old_email": old_email,
                    "new_email": candidate
                })
        if updated:
            db.commit()
        return updated
