from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str

    @field_validator('password')
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v

    @field_validator('role')
    @classmethod
    def role_must_be_valid(cls, v: str) -> str:
        if v not in ('doctor', 'patient'):
            raise ValueError('Role must be either "doctor" or "patient"')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    user_id: int
    role: str
