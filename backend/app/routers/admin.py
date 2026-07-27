"""Admin-only router."""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_admin
from app.models import Booking, BookingStatus, Resource, User
from app.schemas import BookingOut

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/bookings", response_model=dict)
async def all_bookings(
    resource_id: Optional[int] = Query(None),
    status_filter: Optional[BookingStatus] = Query(None, alias="status"),
    date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    query = select(Booking).order_by(Booking.created_at.desc())
    count_query = select(func.count(Booking.id))

    if resource_id:
        query = query.where(Booking.resource_id == resource_id)
        count_query = count_query.where(Booking.resource_id == resource_id)
    if status_filter:
        query = query.where(Booking.status == status_filter)
        count_query = count_query.where(Booking.status == status_filter)
    if date:
        from datetime import datetime, timedelta, timezone
        day_start = datetime.fromisoformat(f"{date}T00:00:00+00:00")
        day_end = day_start + timedelta(days=1)
        query = query.where(Booking.start_time >= day_start, Booking.start_time < day_end)
        count_query = count_query.where(
            Booking.start_time >= day_start, Booking.start_time < day_end
        )

    total = (await db.execute(count_query)).scalar_one()
    bookings = (
        await db.execute(query.offset((page - 1) * limit).limit(limit))
    ).scalars().all()

    for b in bookings:
        await db.refresh(b, ["user", "resource"])

    return {
        "data": [BookingOut.model_validate(b) for b in bookings],
        "page": page,
        "limit": limit,
        "total": total,
    }


@router.get("/users", response_model=list[dict])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(User).order_by(User.created_at))
    users = result.scalars().all()
    return [
        {"id": u.id, "name": u.name, "email": u.email, "role": u.role.value, "created_at": u.created_at.isoformat()}
        for u in users
    ]
