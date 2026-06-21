import random
import string
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from uuid import UUID

from app.models.otp import PasswordResetOTP
from app.models.user import User

class OTPService:
    @staticmethod
    def generate_otp(db: Session, user_id: UUID) -> str:
        """Generate a random 6-digit OTP, store it in the DB, and return it."""
        otp_code = "".join(random.choices(string.digits, k=6))
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
        
        db_otp = PasswordResetOTP(
            user_id=user_id,
            otp_code=otp_code,
            expires_at=expires_at,
            is_used=False
        )
        db.add(db_otp)
        db.commit()
        db.refresh(db_otp)
        return otp_code

    @staticmethod
    def verify_otp(db: Session, employee_code: str, otp_code: str) -> PasswordResetOTP:
        """Verify if the OTP exists, has not expired, and has not been used."""
        user = db.query(User).filter(
            User.employee_code == employee_code, 
            User.is_deleted == False
        ).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User with specified employee code not found",
            )

        db_otp = db.query(PasswordResetOTP).filter(
            PasswordResetOTP.user_id == user.id,
            PasswordResetOTP.otp_code == otp_code
        ).order_by(PasswordResetOTP.created_at.desc()).first()

        if not db_otp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid OTP code",
            )

        if db_otp.is_used:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP code has already been used",
            )

        now = datetime.now(timezone.utc)
        otp_expires = db_otp.expires_at
        
        # Ensure timezone-aware comparison
        if otp_expires.tzinfo is None:
            otp_expires = otp_expires.replace(tzinfo=timezone.utc)

        if otp_expires < now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP code has expired",
            )

        return db_otp

    @staticmethod
    def mark_otp_as_used(db: Session, otp_id: UUID) -> None:
        """Mark the specified OTP as used in the database."""
        db_otp = db.query(PasswordResetOTP).filter(PasswordResetOTP.id == otp_id).first()
        if db_otp:
            db_otp.is_used = True
            db.commit()
