"""Resources CRUD router."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_admin
from app.models import Resource, ResourceCategory, User
from app.schemas import ResourceCreate, ResourceOut, ResourceUpdate

router = APIRouter(prefix="/api/resources", tags=["resources"])


@router.get("", response_model=dict)
async def list_resources(
    search: Optional[str] = Query(None),
    category: Optional[ResourceCategory] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = select(Resource).where(Resource.is_active == True)
    count_query = select(func.count(Resource.id)).where(Resource.is_active == True)

    if search:
        like = f"%{search}%"
        filter_expr = or_(
            Resource.name.ilike(like),
            Resource.description.ilike(like),
            Resource.location.ilike(like),
        )
        query = query.where(filter_expr)
        count_query = count_query.where(filter_expr)

    if category:
        query = query.where(Resource.category == category)
        count_query = count_query.where(Resource.category == category)

    total = (await db.execute(count_query)).scalar_one()
    resources = (
        await db.execute(query.offset((page - 1) * limit).limit(limit))
    ).scalars().all()

    return {
        "data": [ResourceOut.model_validate(r) for r in resources],
        "page": page,
        "limit": limit,
        "total": total,
    }


@router.post("", response_model=ResourceOut, status_code=201)
async def create_resource(
    payload: ResourceCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    resource = Resource(**payload.model_dump())
    db.add(resource)
    await db.commit()
    await db.refresh(resource)
    return ResourceOut.model_validate(resource)


@router.patch("/{resource_id}", response_model=ResourceOut)
async def update_resource(
    resource_id: int,
    payload: ResourceUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    result = await db.execute(select(Resource).where(Resource.id == resource_id))
    resource = result.scalar_one_or_none()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(resource, key, value)

    await db.commit()
    await db.refresh(resource)
    return ResourceOut.model_validate(resource)


@router.delete("/{resource_id}", response_model=dict)
async def delete_resource(
    resource_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    result = await db.execute(select(Resource).where(Resource.id == resource_id))
    resource = result.scalar_one_or_none()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    resource.is_active = False  # soft delete
    await db.commit()
    return {"message": "Resource deactivated"}


@router.get("/{resource_id}", response_model=ResourceOut)
async def get_resource(
    resource_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Resource).where(Resource.id == resource_id, Resource.is_active == True)
    )
    resource = result.scalar_one_or_none()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    return ResourceOut.model_validate(resource)


@router.get("/{resource_id}/bookings", response_model=list[dict])
async def get_resource_bookings_for_day(
    resource_id: int,
    date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$", description="YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from datetime import datetime, timezone, timedelta
    from app.models import Booking, BookingStatus

    day_start = datetime.fromisoformat(f"{date}T00:00:00+00:00")
    day_end = day_start + timedelta(days=1)

    result = await db.execute(
        select(Booking).where(
            Booking.resource_id == resource_id,
            Booking.status == BookingStatus.confirmed,
            Booking.start_time >= day_start,
            Booking.start_time < day_end,
        ).order_by(Booking.start_time)
    )
    bookings = result.scalars().all()
    return [
        {
            "id": b.id,
            "user_id": b.user_id,
            "start_time": b.start_time.isoformat(),
            "end_time": b.end_time.isoformat(),
            "purpose": b.purpose,
        }
        for b in bookings
    ]
