from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from app.schemas.user import UserResponse

class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="Unique corporate email of the user")
    password: str = Field(..., description="Plaintext password")
    department_id: Optional[str] = Field(None, description="Selected department ID")

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: UserResponse
    roles: List[str]
    must_change_password: bool

class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., description="Current plaintext password")
    new_password: str = Field(..., description="New password matching strength policy")

class ForgotPasswordRequest(BaseModel):
    email: EmailStr = Field(..., description="Unique corporate email of the user")

class VerifyOTPRequest(BaseModel):
    email: EmailStr = Field(..., description="Email address associated with the OTP reset")
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit reset OTP code")

class ResetPasswordRequest(BaseModel):
    email: EmailStr = Field(..., description="Email address of the user resetting their password")
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit reset OTP code")
    new_password: str = Field(..., description="New password matching strength policy")


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., description="Valid refresh token")

class RefreshTokenResponse(BaseModel):
    access_token: str
    refresh_token: str

class MessageResponse(BaseModel):
    message: str
