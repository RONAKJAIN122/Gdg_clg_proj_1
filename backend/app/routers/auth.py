"""Auth router: send OTP and verify OTP."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import create_access_token
from app.schemas import MessageResponse, SendOTPRequest, TokenResponse, UserOut, VerifyOTPRequest
from app.services import email_service, otp_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/send-otp", response_model=MessageResponse, status_code=200)
async def send_otp(payload: SendOTPRequest, db: AsyncSession = Depends(get_db)):
    async with db.begin():
        user = await otp_service.get_or_create_user(db, payload.email, payload.name)
        try:
            code = await otp_service.create_otp(db, user)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(e))

    # Send email in the background so the API response returns instantly
    import asyncio
    asyncio.create_task(email_service.send_otp_email(payload.email, payload.name, code))
    return {"message": "OTP sent to your email"}


@router.post("/verify-otp", response_model=TokenResponse, status_code=200)
async def verify_otp(payload: VerifyOTPRequest, db: AsyncSession = Depends(get_db)):
    async with db.begin():
        try:
            user = await otp_service.validate_otp(db, payload.email, payload.otp)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    token = create_access_token(user.id, user.role.value)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user),
    )
