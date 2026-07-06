from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime


def resp(data: Any = None, code: int = 0, msg: str = "ok") -> dict:
    return {"code": code, "msg": msg, "data": data}


class PersonIn(BaseModel):
    name: str
    phone: Optional[str] = None
    role: str = "guest"
    avatar_path: Optional[str] = None
    is_active: bool = True


class PersonOut(BaseModel):
    id: int
    name: str
    phone: Optional[str] = None
    role: str
    avatar_path: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    face_count: int = 0

    model_config = {"from_attributes": True}


class PersonUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    avatar_path: Optional[str] = None
    is_active: Optional[bool] = None


class PaginatedResponse(BaseModel):
    total: int
    items: list
