"""
OTP generation, validation, and rate limiting.
"""
import random
import string
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import OTPCode, User


OTP_VALID_MINUTES = 5
OTP_RATE_LIMIT = 3          # max OTPs per window
OTP_RATE_WINDOW_MINUTES = 10

# ---------------------------------------------------------------------------
# TEMPORARY TESTING WHITELIST (Set ENABLE_TEMP_WHITELIST = False to disable)
# ---------------------------------------------------------------------------
ENABLE_TEMP_WHITELIST = True
TEMP_ALLOWED_EMAILS = {
    "admin@me.in",
    "25ucc183@lnmiit.ac.in",
    "25ucs093@lnmiit.ac.in",
    "25ucs012@lnmiit.ac.in",
    "25ucs216@lnmiit.ac.in",
    "lnmiiitopt@gmail.com",
    "jain.ronak122@gmail.com",
}


def check_email_whitelisted(email: str) -> None:
    """Raises ValueError if temporary whitelist is enabled and email is not allowed."""
    if ENABLE_TEMP_WHITELIST:
        clean_email = email.strip().lower()
        if clean_email not in TEMP_ALLOWED_EMAILS:
            raise ValueError(
                "Beta Testing Mode: This email is not on the invited testers list."
            )


def _generate_otp() -> str:
    return "".join(random.choices(string.digits, k=6))


async def get_or_create_user(db: AsyncSession, email: str, name: str) -> User:
    from app.models import UserRole
    check_email_whitelisted(email)
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    is_admin_email = (email.strip().lower() == "admin@me.in")
    desired_role = UserRole.admin if is_admin_email else UserRole.student

    if not user:
        user = User(email=email, name=name, role=desired_role)
        db.add(user)
        await db.flush()  # get the id without full commit
    else:
        # Update name & role for admin email
        user.name = name
        if is_admin_email:
            user.role = UserRole.admin
    return user


async def check_rate_limit(db: AsyncSession, user_id: int) -> None:
    """Raise ValueError if too many OTPs requested in the window."""
    window_start = datetime.now(timezone.utc) - timedelta(minutes=OTP_RATE_WINDOW_MINUTES)
    result = await db.execute(
        select(func.count(OTPCode.id)).where(
            OTPCode.user_id == user_id,
            OTPCode.created_at >= window_start,
        )
    )
    count = result.scalar_one()
    if count >= OTP_RATE_LIMIT:
        raise ValueError(f"Rate limit exceeded: max {OTP_RATE_LIMIT} OTPs per {OTP_RATE_WINDOW_MINUTES} minutes")


async def create_otp(db: AsyncSession, user: User) -> str:
    await check_rate_limit(db, user.id)

    # Invalidate any previously unused OTPs for this user
    from sqlalchemy import update as sa_update
    await db.execute(
        sa_update(OTPCode)
        .where(OTPCode.user_id == user.id, OTPCode.used == False)
        .values(used=True)
    )

    code = _generate_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_VALID_MINUTES)
    otp_record = OTPCode(user_id=user.id, code=code, expires_at=expires_at)
    db.add(otp_record)
    await db.flush()
    return code


async def validate_otp(db: AsyncSession, email: str, code: str) -> User:
    """Returns the user if OTP is valid; raises ValueError otherwise."""
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        raise ValueError("User not found")

    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(OTPCode).where(
            OTPCode.user_id == user.id,
            OTPCode.code == code,
            OTPCode.used == False,
            OTPCode.expires_at > now,
        )
    )
    otp_record = result.scalar_one_or_none()
    if not otp_record:
        raise ValueError("Invalid or expired OTP")

    # Mark as used (single use)
    otp_record.used = True
    await db.flush()
    return user
