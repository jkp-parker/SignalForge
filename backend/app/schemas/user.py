from datetime import datetime

from pydantic import BaseModel


class UserBase(BaseModel):
    username: str
    full_name: str = ""
    role: str = "operator"


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    username: str | None = None
    full_name: str | None = None
    role: str | None = None
    password: str | None = None
    is_active: bool | None = None


class UserResponse(UserBase):
    id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
