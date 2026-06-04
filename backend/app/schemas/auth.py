from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import DisplayName

# Minimum length for any password the user sets. Enforced server-side so a
# tampered/non-browser client can't create weak credentials.
MIN_PASSWORD_LENGTH = 8


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=MIN_PASSWORD_LENGTH)
    display_name: DisplayName


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AccountOut(BaseModel):
    id: int
    email: str
    display_name: str
    # Collaboration context (computed in /me).
    is_shared: bool = False
    member_count: int = 1
    role: str = "owner"

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    message: str
    # Populated only when RESEND_API_KEY is unset, so flows stay testable in dev.
    debug_token: str | None = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(min_length=MIN_PASSWORD_LENGTH)


class InviteRequest(BaseModel):
    email: EmailStr


class AcceptInviteLogin(BaseModel):
    token: str
    email: EmailStr
    password: str


class AcceptInviteRegister(BaseModel):
    token: str
    email: EmailStr
    password: str = Field(min_length=MIN_PASSWORD_LENGTH)
    display_name: DisplayName
