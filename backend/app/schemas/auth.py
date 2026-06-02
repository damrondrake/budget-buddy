from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: str


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
    password: str


class InviteRequest(BaseModel):
    email: EmailStr


class AcceptInviteLogin(BaseModel):
    token: str
    email: EmailStr
    password: str


class AcceptInviteRegister(BaseModel):
    token: str
    email: EmailStr
    password: str
    display_name: str
