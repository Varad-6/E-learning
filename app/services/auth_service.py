from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import jwt

from app.models.user import User
from app.models.role import Role
from app.schemas.auth import (
    LoginRequest, LoginResponse, ChangePasswordRequest, 
    ForgotPasswordRequest, VerifyOTPRequest, ResetPasswordRequest,
    RefreshTokenRequest, RefreshTokenResponse
)
from app.core.security import (
    verify_password, get_password_hash, create_access_token, 
    create_refresh_token, decode_token, validate_password_strength
)
from app.services.otp_service import OTPService
from app.services.email_service import EmailService
from app.services.token_service import TokenService
from app.core.config import settings

class AuthService:
    @staticmethod
    def login(db: Session, request: LoginRequest) -> LoginResponse:
        """Authenticate user, verify status/password, and return JWT tokens with user data."""
        # Find active user
        user = db.query(User).filter(
            User.employee_code == request.employee_code, 
            User.is_deleted == False
        ).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid employee code or password"
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive"
            )

        # Verify password
        if not verify_password(request.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid employee code or password"
            )

        # Extract roles
        roles = [r.name for r in user.roles]

        # JWT claims
        claims = {
            "user_id": str(user.id),
            "employee_code": user.employee_code,
            "email": user.email,
            "roles": roles
        }

        # Generate tokens
        access_token = create_access_token(claims)
        refresh_token_str = create_refresh_token(claims)

        # Store refresh token in database
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        TokenService.create_refresh_token_in_db(
            db=db,
            user_id=user.id,
            token=refresh_token_str,
            expires_at=expires_at
        )

        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token_str,
            user=user,
            roles=roles,
            must_change_password=user.must_change_password
        )

    @staticmethod
    def change_password(db: Session, user: User, request: ChangePasswordRequest) -> None:
        """Update current logged-in user's password after verifying password and policy."""
        # Verify current password
        if not verify_password(request.current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )

        # Verify password policy
        if not validate_password_strength(request.new_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "New password does not meet complexity requirements. "
                    "Must be at least 8 characters long, contain an uppercase letter, "
                    "a lowercase letter, a number, and a special character."
                )
            )

        # Hash new password
        user.password_hash = get_password_hash(request.new_password)
        user.must_change_password = False
        db.commit()

    @staticmethod
    def forgot_password(db: Session, request: ForgotPasswordRequest) -> None:
        """Trigger OTP generation and dispatch email for password resets."""
        user = db.query(User).filter(
            User.employee_code == request.employee_code,
            User.is_deleted == False
        ).first()

        # For security, do not leak user existence (though LMS typically ok, let's keep it robust)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee code not found"
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive"
            )

        # Generate and save OTP
        otp_code = OTPService.generate_otp(db, user.id)

        # Send SMTP Email
        EmailService.send_otp_email(user.email, otp_code)

    @staticmethod
    def verify_otp(db: Session, request: VerifyOTPRequest) -> None:
        """Verify OTP validity without resetting password yet."""
        # Simply verifying will check existence, expiration, and use state
        OTPService.verify_otp(db, request.employee_code, request.otp)

    @staticmethod
    def reset_password(db: Session, request: ResetPasswordRequest) -> None:
        """Verify OTP and update user password with new hash."""
        # Verify OTP
        db_otp = OTPService.verify_otp(db, request.employee_code, request.otp)

        # Validate password strength
        if not validate_password_strength(request.new_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "New password does not meet complexity requirements. "
                    "Must be at least 8 characters long, contain an uppercase letter, "
                    "a lowercase letter, a number, and a special character."
                )
            )

        user = db.query(User).filter(User.id == db_otp.user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Hash and update
        user.password_hash = get_password_hash(request.new_password)
        user.must_change_password = False
        
        # Mark OTP as used
        OTPService.mark_otp_as_used(db, db_otp.id)
        
        db.commit()

    @staticmethod
    def refresh_token(db: Session, request: RefreshTokenRequest) -> RefreshTokenResponse:
        """Authenticate refresh token, rotate tokens, and return a new JWT pair."""
        # Verify token in database
        db_token = TokenService.verify_refresh_token_in_db(db, request.refresh_token)

        # Verify JWT structure
        try:
            payload = decode_token(request.refresh_token, is_refresh=True)
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token is expired"
            )
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token is invalid"
            )

        # Retrieve user
        user = db.query(User).filter(User.id == db_token.user_id, User.is_deleted == False).first()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User associated with this token is inactive or deleted"
            )

        # Revoke old refresh token (rotation)
        TokenService.revoke_refresh_token(db, request.refresh_token)

        # Create new credentials
        roles = [r.name for r in user.roles]
        claims = {
            "user_id": str(user.id),
            "employee_code": user.employee_code,
            "email": user.email,
            "roles": roles
        }

        # Generate new pair
        new_access_token = create_access_token(claims)
        new_refresh_token_str = create_refresh_token(claims)

        # Save new refresh token in DB
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        TokenService.create_refresh_token_in_db(
            db=db,
            user_id=user.id,
            token=new_refresh_token_str,
            expires_at=expires_at
        )

        return RefreshTokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token_str
        )

    @staticmethod
    def logout(db: Session, refresh_token_str: str) -> None:
        """Revoke the user's refresh token to invalidate future refreshes."""
        TokenService.revoke_refresh_token(db, refresh_token_str)
