import secrets
import string
from datetime import datetime, timedelta, timezone
from sqlalchemy import func
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from uuid import UUID

from app.models.otp import PasswordResetOTP, EmailVerificationOTP
from app.models.user import User


class OTPService:
    @staticmethod
    def _generate_numeric_code(length: int = 6) -> str:
        """Generate a cryptographically random numeric OTP."""
        return "".join(secrets.choice(string.digits) for _ in range(length))

    @staticmethod
    def generate_otp(db: Session, user_id: UUID) -> str:
        """Generate a 6-digit password reset OTP, invalidate prior unused OTPs, and store it."""
        db.query(PasswordResetOTP).filter(
            PasswordResetOTP.user_id == user_id,
            PasswordResetOTP.is_used == False,
        ).update({"is_used": True}, synchronize_session=False)

        otp_code = OTPService._generate_numeric_code(6)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

        db_otp = PasswordResetOTP(
            user_id=user_id,
            otp_code=otp_code,
            expires_at=expires_at,
            is_used=False,
        )
        db.add(db_otp)
        db.commit()
        db.refresh(db_otp)
        return otp_code

    @staticmethod
    def verify_otp(db: Session, email: str, otp_code: str) -> PasswordResetOTP:
        """Verify if the latest password reset OTP matches, is unused, and has not expired."""
        normalized_email = email.strip().lower()
        user = db.query(User).filter(
            func.lower(User.email) == normalized_email,
            User.is_deleted == False,
        ).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired OTP code",
            )

        db_otp = db.query(PasswordResetOTP).filter(
            PasswordResetOTP.user_id == user.id,
            PasswordResetOTP.is_used == False,
        ).order_by(PasswordResetOTP.created_at.desc()).first()

        if not db_otp or not secrets.compare_digest(db_otp.otp_code, otp_code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired OTP code",
            )

        now = datetime.now(timezone.utc)
        otp_expires = db_otp.expires_at
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

    @staticmethod
    def generate_verification_otp(db: Session, email: str) -> str:
        """Generate a 6-digit email verification OTP and invalidate prior unverified codes."""
        db.query(EmailVerificationOTP).filter(
            EmailVerificationOTP.email == email,
            EmailVerificationOTP.is_verified == False,
        ).update({"is_verified": True}, synchronize_session=False)

        otp_code = OTPService._generate_numeric_code(6)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

        db_otp = EmailVerificationOTP(
            email=email,
            otp_code=otp_code,
            expires_at=expires_at,
            is_verified=False,
        )
        db.add(db_otp)
        db.commit()
        db.refresh(db_otp)
        return otp_code

    @staticmethod
    def verify_verification_otp(db: Session, email: str, otp_code: str) -> EmailVerificationOTP:
        """Verify the latest email verification OTP and mark it verified."""
        db_otp = db.query(EmailVerificationOTP).filter(
            EmailVerificationOTP.email == email,
            EmailVerificationOTP.is_verified == False,
        ).order_by(EmailVerificationOTP.created_at.desc()).first()

        if not db_otp or not secrets.compare_digest(db_otp.otp_code, otp_code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification code",
            )

        now = datetime.now(timezone.utc)
        otp_expires = db_otp.expires_at
        if otp_expires.tzinfo is None:
            otp_expires = otp_expires.replace(tzinfo=timezone.utc)

        if otp_expires < now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification code has expired",
            )

        db_otp.is_verified = True
        db.commit()
        db.refresh(db_otp)
        return db_otp
