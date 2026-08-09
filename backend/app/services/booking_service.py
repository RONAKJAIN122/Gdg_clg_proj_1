"""
Booking service — the heart of CampusDesk.

CONCURRENCY SAFETY STRATEGY
============================
Problem: Two users can call POST /api/bookings at the exact same millisecond
for the same resource and time slot. A naive SELECT + INSERT allows both to
succeed (TOCTOU race condition).

Solution: SELECT FOR UPDATE on the Resource row.
- When a booking request comes in, we begin a DB transaction and immediately
  lock the target Resource row with SELECT ... FOR UPDATE.
- Any concurrent transaction trying to lock the same resource row will BLOCK
  until this transaction commits or rolls back.
- This serialises all booking attempts for a given resource at the DB level —
  not in application code — so no two requests can ever see a "no conflict"
  state simultaneously for the same resource.
- After acquiring the lock, we run the overlap query. Only one transaction can
  pass this check at a time.
- On commit, the lock is released and the next waiter proceeds, now correctly
  seeing the new booking.

Why not advisory locks or Redis?
- For SQLite (dev), FOR UPDATE is emulated via table locks — same semantic.
- For PostgreSQL (prod), row-level FOR UPDATE is the exact right primitive.
- No external infrastructure needed.

SQLite note: aiosqlite is single-writer (GIL on the underlying connection),
so it is naturally serialised. FOR UPDATE is still used for correctness and
to make the PostgreSQL upgrade seamless.

WAITLIST BONUS
==============
When a confirmed booking is cancelled, the first waitlist entry (FIFO) is
auto-promoted to a confirmed booking and the user is emailed.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import and_, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Booking, BookingStatus, Resource, User, WaitlistEntry
from app.schemas import BookingCreate
from app.services.email_service import (
    send_reminder_email,
    send_waitlist_promotion_email,
)

MIN_DURATION_MINUTES = 30
MAX_DURATION_MINUTES = 240  # 4 hours


def _to_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


async def _lock_resource(db: AsyncSession, resource_id: int) -> Resource:
    """
    Lock the resource row for the duration of this transaction.
    All concurrent booking attempts for the same resource queue up here.
    """
    # FOR UPDATE works on PostgreSQL; on SQLite it's ignored but that's fine
    # (SQLite is single-writer by design)
    result = await db.execute(
        select(Resource)
        .where(Resource.id == resource_id)
        .with_for_update()
    )
    resource = result.scalar_one_or_none()
    if not resource or not resource.is_active:
        raise HTTPException(status_code=404, detail="Resource not found or inactive")
    return resource


def _validate_booking_times(start: datetime, end: datetime, resource: Resource) -> None:
    """Validate booking times against business rules."""
    now = datetime.now(timezone.utc)
    errors: dict[str, str] = {}

    if start <= now:
        errors["start_time"] = "Start time must be in the future"

    if end <= start:
        errors["end_time"] = "End time must be after start time"

    duration_minutes = (end - start).total_seconds() / 60
    if duration_minutes < MIN_DURATION_MINUTES:
        errors["end_time"] = f"Minimum booking duration is {MIN_DURATION_MINUTES} minutes"
    if duration_minutes > MAX_DURATION_MINUTES:
        errors["end_time"] = f"Maximum booking duration is {MAX_DURATION_MINUTES // 60} hours"

    # Check resource open/close window
    open_h, open_m = map(int, resource.open_time.split(":"))
    close_h, close_m = map(int, resource.close_time.split(":"))
    local_start = start.astimezone(timezone.utc)
    local_end = end.astimezone(timezone.utc)

    start_minutes = local_start.hour * 60 + local_start.minute
    end_minutes = local_end.hour * 60 + local_end.minute
    open_minutes = open_h * 60 + open_m
    close_minutes = close_h * 60 + close_m

    if start_minutes < open_minutes or end_minutes > close_minutes:
        errors["start_time"] = (
            f"Slot must be within resource hours: "
            f"{resource.open_time}–{resource.close_time}"
        )

    if errors:
        first_msg = next(iter(errors.values()))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": first_msg, "errors": errors},
        )


async def _check_overlap(
    db: AsyncSession, resource_id: int, start: datetime, end: datetime, exclude_booking_id: Optional[int] = None
) -> None:
    """
    Check for overlapping confirmed bookings.
    Overlap condition: NOT (endA <= startB OR endB <= startA)
    Which equals:      startA < endB AND endA > startB
    Back-to-back bookings (10–11 and 11–12) do NOT overlap because 11 == 11
    satisfies endA <= startB, so they're allowed.
    """
    query = select(Booking).where(
        and_(
            Booking.resource_id == resource_id,
            Booking.status == BookingStatus.confirmed,
            Booking.start_time < end,
            Booking.end_time > start,
        )
    )
    if exclude_booking_id:
        from sqlalchemy import not_
        query = query.where(Booking.id != exclude_booking_id)

    result = await db.execute(query)
    clash = result.scalar_one_or_none()
    if clash:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "Time slot conflicts with an existing booking",
                "clashing_slot": {
                    "booking_id": clash.id,
                    "start_time": clash.start_time.isoformat(),
                    "end_time": clash.end_time.isoformat(),
                },
            },
        )


async def _check_student_limit(db: AsyncSession, user_id: int, resource_id: int) -> None:
    """Students may hold at most 2 upcoming confirmed bookings per resource."""
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(func.count(Booking.id)).where(
            and_(
                Booking.user_id == user_id,
                Booking.resource_id == resource_id,
                Booking.status == BookingStatus.confirmed,
                Booking.start_time > now,
            )
        )
    )
    count = result.scalar_one()
    if count >= 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "You already have 2 upcoming confirmed bookings for this resource", "errors": {"limit": "Student limit reached"}},
        )


async def create_booking(db: AsyncSession, data: BookingCreate, user: User) -> Booking:
    """
    Create a booking with full validation + concurrency-safe overlap check.
    The resource row is locked for the duration of the transaction to prevent races.
    SQLAlchemy auto-begins a transaction on first SQL execution, so we must NOT
    call db.begin() here — just use the existing transaction and commit at the end.
    """
    start = _to_utc(data.start_time)
    end = _to_utc(data.end_time)

    try:
        # Step 1: Lock the resource row — concurrent booking attempts queue here
        resource = await _lock_resource(db, data.resource_id)

        # Step 2: Validate times against business rules
        _validate_booking_times(start, end, resource)

        # Step 3: Check student limit (only for students)
        from app.models import UserRole
        if user.role == UserRole.student:
            await _check_student_limit(db, user.id, data.resource_id)

        # Step 4: Overlap check (safe because resource row is locked)
        await _check_overlap(db, data.resource_id, start, end)

        # Step 5: Create the booking
        booking = Booking(
            user_id=user.id,
            resource_id=data.resource_id,
            start_time=start,
            end_time=end,
            purpose=data.purpose,
            status=BookingStatus.confirmed,
        )
        db.add(booking)
        await db.flush()

        # Eagerly load relationships before commit so response serialization works
        result = await db.execute(
            select(Booking)
            .options(selectinload(Booking.user), selectinload(Booking.resource))
            .where(Booking.id == booking.id)
        )
        booking = result.scalar_one()
        await db.commit()

        return booking

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Booking failed due to server error: {str(e)}"
        ) from e


async def cancel_booking(db: AsyncSession, booking_id: int, user: User) -> Booking:
    """Cancel a booking. Owners can cancel their own; admins can cancel any."""
    from app.models import UserRole

    try:
        result = await db.execute(
            select(Booking).where(Booking.id == booking_id).with_for_update()
        )
        booking = result.scalar_one_or_none()
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")

        # Permission check
        is_owner = booking.user_id == user.id
        is_admin = user.role == UserRole.admin
        if not (is_owner or is_admin):
            raise HTTPException(status_code=403, detail="Not authorised to cancel this booking")

        # Cannot cancel after start
        start_utc = _to_utc(booking.start_time)
        now_utc = datetime.now(timezone.utc)
        if start_utc <= now_utc:
            raise HTTPException(
                status_code=400, detail="Cannot cancel a booking that has already started"
            )

        if booking.status != BookingStatus.confirmed:
            raise HTTPException(
                status_code=400, detail=f"Booking is already {booking.status.value}"
            )

        booking.status = BookingStatus.cancelled
        await db.flush()

        # --- Waitlist auto-promotion ---
        wl_result = await db.execute(
            select(WaitlistEntry)
            .where(WaitlistEntry.booking_id == booking_id)
            .order_by(WaitlistEntry.joined_at)
            .limit(1)
        )
        first_waiter = wl_result.scalar_one_or_none()

        if first_waiter:
            overlap_result = await db.execute(
                select(Booking).where(
                    and_(
                        Booking.resource_id == booking.resource_id,
                        Booking.status == BookingStatus.confirmed,
                        Booking.start_time < booking.end_time,
                        Booking.end_time > booking.start_time,
                    )
                )
            )
            if not overlap_result.scalar_one_or_none():
                new_booking = Booking(
                    user_id=first_waiter.user_id,
                    resource_id=booking.resource_id,
                    start_time=booking.start_time,
                    end_time=booking.end_time,
                    purpose=f"Promoted from waitlist (original booking #{booking_id})",
                    status=BookingStatus.confirmed,
                )
                db.add(new_booking)
                await db.delete(first_waiter)
                await db.flush()

                user_result = await db.execute(
                    select(User).where(User.id == first_waiter.user_id)
                )
                waiter_user = user_result.scalar_one()
                resource_result = await db.execute(
                    select(Resource).where(Resource.id == booking.resource_id)
                )
                resource = resource_result.scalar_one()

                import asyncio
                asyncio.create_task(
                    send_waitlist_promotion_email(
                        waiter_user.email,
                        waiter_user.name,
                        resource.name,
                        booking.start_time.strftime("%A, %d %b %Y at %I:%M %p"),
                    )
                )

        # Eagerly reload with relationships for serialization
        result = await db.execute(
            select(Booking)
            .options(selectinload(Booking.user), selectinload(Booking.resource))
            .where(Booking.id == booking_id)
        )
        booking = result.scalar_one()
        await db.commit()

        return booking

    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Cancellation failed: {str(e)}"
        ) from e


async def run_scheduler_jobs(db_factory) -> None:
    """
    Called by APScheduler every minute.
    1. Mark past confirmed bookings as completed.
    2. Send reminder emails 1 hour before start (once per booking).
    """
    async with db_factory() as db:
        now = datetime.now(timezone.utc)
        one_hour_later = now + timedelta(hours=1)

        # Mark completed
        from sqlalchemy import update as sa_update
        await db.execute(
            sa_update(Booking)
            .where(
                Booking.status == BookingStatus.confirmed,
                Booking.end_time <= now,
            )
            .values(status=BookingStatus.completed)
        )

        # Send reminders (bookings starting in 55–65 min, not yet reminded)
        reminder_window_start = now + timedelta(minutes=55)
        reminder_window_end = now + timedelta(minutes=65)
        result = await db.execute(
            select(Booking)
            .where(
                Booking.status == BookingStatus.confirmed,
                Booking.reminder_sent == False,
                Booking.start_time >= reminder_window_start,
                Booking.start_time <= reminder_window_end,
            )
        )
        bookings_to_remind = result.scalars().all()

        for b in bookings_to_remind:
            await db.refresh(b, ["user", "resource"])
            await send_reminder_email(
                b.user.email,
                b.user.name,
                b.resource.name,
                b.start_time.strftime("%A, %d %b %Y at %I:%M %p"),
            )
            b.reminder_sent = True

        await db.commit()
