from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.auth import (
    LoginRequest, LoginResponse, ChangePasswordRequest,
    ForgotPasswordRequest, VerifyOTPRequest, ResetPasswordRequest,
    RefreshTokenRequest, RefreshTokenResponse, MessageResponse
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post(
    "/login", 
    response_model=LoginResponse, 
    status_code=status.HTTP_200_OK,
    summary="Authenticate User",
    description="Login using employee code and password. Returns access and refresh JWTs."
)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    return AuthService.login(db, request)

@router.post(
    "/change-password",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Change Password (First Login)",
    description="Change password for the logged-in user. Resets the must_change_password flag."
)
def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    AuthService.change_password(db, current_user, request)
    return MessageResponse(message="Password changed successfully")

@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Request Password Reset OTP",
    description="Generates a 6-digit OTP code, stores it, and sends it to the user's registered email."
)
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    AuthService.forgot_password(db, request)
    return MessageResponse(message="OTP has been sent to your registered email address")

@router.post(
    "/verify-otp",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify Password Reset OTP",
    description="Checks if the OTP code matches the employee, has not expired, and has not been used."
)
def verify_otp(request: VerifyOTPRequest, db: Session = Depends(get_db)):
    AuthService.verify_otp(db, request)
    return MessageResponse(message="OTP verification successful")

@router.post(
    "/reset-password",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Reset Password with OTP",
    description="Resets the user's password using the verified OTP, invalidating the OTP, and clearing must_change_password."
)
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    AuthService.reset_password(db, request)
    return MessageResponse(message="Password has been reset successfully")

@router.post(
    "/refresh",
    response_model=RefreshTokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Refresh Access Token",
    description="Uses a valid, non-revoked refresh token to issue a new access and rotated refresh token."
)
def refresh(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    return AuthService.refresh_token(db, request)

@router.post(
    "/logout",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="User Logout",
    description="Revokes the provided refresh token in the database to prevent further access token generation."
)
def logout(
    request: RefreshTokenRequest, 
    db: Session = Depends(get_db)
):
    AuthService.logout(db, request.refresh_token)
    return MessageResponse(message="Logged out successfully")
