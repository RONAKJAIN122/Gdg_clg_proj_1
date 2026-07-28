"""Bookings router."""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Booking, BookingStatus, User
from app.schemas import BookingCreate, BookingOut, WaitlistJoin, WaitlistOut
from app.services.booking_service import cancel_booking, create_booking

router = APIRouter(prefix="/api/bookings", tags=["bookings"])


@router.post("", response_model=BookingOut, status_code=201)
async def create(
    payload: BookingCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await create_booking(db, payload, user)


@router.get("/me", response_model=dict)
async def my_bookings(
    status_filter: Optional[BookingStatus] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = select(Booking).where(Booking.user_id == user.id)
    count_query = select(func.count(Booking.id)).where(Booking.user_id == user.id)

    if status_filter:
        query = query.where(Booking.status == status_filter)
        count_query = count_query.where(Booking.status == status_filter)
    else:
        # Exclude cancelled bookings by default
        query = query.where(Booking.status != BookingStatus.cancelled)
        count_query = count_query.where(Booking.status != BookingStatus.cancelled)

    # Order date-wise (newest/upcoming date first)
    query = query.order_by(Booking.start_time.desc())

    total = (await db.execute(count_query)).scalar_one()
    bookings = (
        await db.execute(query.offset((page - 1) * limit).limit(limit))
    ).scalars().all()

    # Eager-load relationships
    for b in bookings:
        await db.refresh(b, ["user", "resource"])

    return {
        "data": [BookingOut.model_validate(b) for b in bookings],
        "page": page,
        "limit": limit,
        "total": total,
    }


@router.patch("/{booking_id}/cancel", response_model=BookingOut)
async def cancel(
    booking_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return await cancel_booking(db, booking_id, user)


# ---------------------------------------------------------------------------
# Waitlist (bonus)
# ---------------------------------------------------------------------------

@router.post("/{booking_id}/waitlist", response_model=WaitlistOut, status_code=201)
async def join_waitlist(
    booking_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from app.models import WaitlistEntry
    from fastapi import HTTPException

    # Check booking exists and is confirmed
    result = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = result.scalar_one_or_none()
    if not booking or booking.status != BookingStatus.confirmed:
        raise HTTPException(status_code=404, detail="Booking not found or not active")

    # Check not already on waitlist
    existing = await db.execute(
        select(WaitlistEntry).where(
            and_(WaitlistEntry.user_id == user.id, WaitlistEntry.booking_id == booking_id)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already on waitlist for this booking")

    entry = WaitlistEntry(user_id=user.id, booking_id=booking_id)
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return WaitlistOut.model_validate(entry)
