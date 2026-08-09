"""
Pydantic schemas for request validation and response serialization.
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models import BookingStatus, ResourceCategory, UserRole


# ---------------------------------------------------------------------------
# Generic
# ---------------------------------------------------------------------------

class PaginatedResponse(BaseModel):
    data: list
    page: int
    limit: int
    total: int


class MessageResponse(BaseModel):
    message: str
    admin_otp: Optional[str] = None


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class SendOTPRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Resource
# ---------------------------------------------------------------------------

class ResourceCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    location: Optional[str] = None
    category: ResourceCategory
    open_time: str = Field("09:00", pattern=r"^\d{2}:\d{2}$")
    close_time: str = Field("21:00", pattern=r"^\d{2}:\d{2}$")


class ResourceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = None
    location: Optional[str] = None
    category: Optional[ResourceCategory] = None
    open_time: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    close_time: Optional[str] = Field(None, pattern=r"^\d{2}:\d{2}$")
    is_active: Optional[bool] = None


class ResourceOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    location: Optional[str]
    category: ResourceCategory
    open_time: str
    close_time: str
    is_active: bool

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Booking
# ---------------------------------------------------------------------------

class BookingCreate(BaseModel):
    resource_id: int
    start_time: datetime
    end_time: datetime
    purpose: Optional[str] = None

    @field_validator("start_time", "end_time", mode="before")
    @classmethod
    def parse_dt(cls, v):
        if isinstance(v, str):
            # Accept both with and without timezone
            from datetime import timezone
            dt = datetime.fromisoformat(v)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        return v


class BookingOut(BaseModel):
    id: int
    resource_id: int
    user_id: int
    start_time: datetime
    end_time: datetime
    purpose: Optional[str]
    status: BookingStatus
    created_at: datetime
    resource: Optional[ResourceOut] = None
    user: Optional[UserOut] = None

    model_config = {
        "from_attributes": True,
        # Serialize datetimes as naive strings (no Z / timezone suffix)
        # so the frontend can display them as wall-clock time without IST shift
        "json_encoders": {
            datetime: lambda v: v.strftime("%Y-%m-%dT%H:%M:%S") if v else None
        },
    }


class WaitlistJoin(BaseModel):
    booking_id: int


class WaitlistOut(BaseModel):
    id: int
    user_id: int
    booking_id: int
    joined_at: datetime

    model_config = {"from_attributes": True}
