"""
FastAPI application entry point.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from sqlalchemy import func, select
from app.database import AsyncSessionLocal, Base, engine
from app.models import Resource, ResourceCategory
from app.routers import auth, resources, bookings, admin
from app.scheduler import start_scheduler

SEED_RESOURCES = [
    # Halls
    {
        "name": "Auditorium 1",
        "description": "Main campus auditorium with 300-seat capacity, stage lighting, and Dolby audio system.",
        "location": "Central Academic Block",
        "category": ResourceCategory.hall,
        "open_time": "09:00",
        "close_time": "21:00",
    },
    {
        "name": "Auditorium 2 (AC)",
        "description": "Air-Conditioned mini auditorium with 150 seating capacity, modern projector & acoustic panels.",
        "location": "Academic Block A, 1st Floor",
        "category": ResourceCategory.hall,
        "open_time": "09:00",
        "close_time": "21:00",
    },
    {
        "name": "Auditorium 3",
        "description": "Compact auditorium with 100 seating capacity for department seminars and club meets.",
        "location": "Academic Block B, Ground Floor",
        "category": ResourceCategory.hall,
        "open_time": "09:00",
        "close_time": "21:00",
    },
    # Equipment
    {
        "name": "Sony DSLR Camera Kit",
        "description": "Sony Alpha Mirrorless Camera with 24-70mm GM lens, dual batteries, and 128GB SD card.",
        "location": "Media & Photography Club Room",
        "category": ResourceCategory.equipment,
        "open_time": "09:00",
        "close_time": "21:00",
    },
    {
        "name": "Heavy-Duty Studio Tripods",
        "description": "Set of 2 fluid-head aluminum video tripods with quick-release plates.",
        "location": "Media & Photography Club Room",
        "category": ResourceCategory.equipment,
        "open_time": "09:00",
        "close_time": "21:00",
    },
    {
        "name": "Wireless Collar & Handheld Mics",
        "description": "Sennheiser dual-channel UHF wireless microphone kit with receiver unit.",
        "location": "Audio-Visual Cell, Block A",
        "category": ResourceCategory.equipment,
        "open_time": "09:00",
        "close_time": "21:00",
    },
    # Rooms (Lecture Halls)
    {
        "name": "Lecture Hall LT-1",
        "description": "120-seat stepped lecture theater with dual projectors, smart board, and central AC.",
        "location": "Lecture Hall Complex (LHC)",
        "category": ResourceCategory.room,
        "open_time": "09:00",
        "close_time": "21:00",
    },
    {
        "name": "Lecture Hall LT-2",
        "description": "120-seat stepped lecture theater equipped for interactive lectures and presentations.",
        "location": "Lecture Hall Complex (LHC)",
        "category": ResourceCategory.room,
        "open_time": "09:00",
        "close_time": "21:00",
    },
    # SAC & Sports
    {
        "name": "SAC Music Room",
        "description": "Soundproof practice space equipped with drum set, keyboards, amplifiers, and acoustic guitars.",
        "location": "Student Activity Centre (SAC)",
        "category": ResourceCategory.other,
        "open_time": "09:00",
        "close_time": "21:00",
    },
    {
        "name": "SAC Dance & Activity Room",
        "description": "Spacious wooden-floor practice hall with mirror wall and sound system for dance & drama clubs.",
        "location": "Student Activity Centre (SAC), 1st Floor",
        "category": ResourceCategory.other,
        "open_time": "09:00",
        "close_time": "21:00",
    },
    {
        "name": "Football Ground",
        "description": "Full-size grass football pitch with floodlights for evening practice and tournaments.",
        "location": "LNMIIT Sports Complex",
        "category": ResourceCategory.other,
        "open_time": "09:00",
        "close_time": "21:00",
    },
    {
        "name": "Volleyball Court",
        "description": "Outdoor synthetic volleyball court with referee stand and night lights.",
        "location": "LNMIIT Sports Complex",
        "category": ResourceCategory.other,
        "open_time": "09:00",
        "close_time": "21:00",
    },
    {
        "name": "Tennis Ground",
        "description": "Dual hard-surface tennis courts with high-power LED floodlights.",
        "location": "LNMIIT Sports Complex",
        "category": ResourceCategory.other,
        "open_time": "09:00",
        "close_time": "21:00",
    },
]


async def seed_sample_classes(db):
    """Seed sample scheduled classes for Lecture Halls and SAC rooms for today & tomorrow."""
    from datetime import datetime, timezone, timedelta
    from app.models import User, UserRole, Booking, BookingStatus

    # Get or create seed user for faculty/academic cell
    user_result = await db.execute(select(User).where(User.email == "faculty@lnmiit.ac.in"))
    seed_user = user_result.scalar_one_or_none()
    if not seed_user:
        seed_user = User(name="LNMIIT Academic Cell", email="faculty@lnmiit.ac.in", role=UserRole.admin)
        db.add(seed_user)
        await db.flush()

    today = datetime.now(timezone.utc)
    today_str = today.strftime("%Y-%m-%d")
    tomorrow_str = (today + timedelta(days=1)).strftime("%Y-%m-%d")

    # Map of target resources and sample slots
    sample_schedules = [
        ("Lecture Hall LT-1", [
            (f"{today_str}T10:00:00+00:00", f"{today_str}T11:30:00+00:00", "CS101: Computer Programming Lecture (Dr. Sharma)"),
            (f"{today_str}T14:00:00+00:00", f"{today_str}T15:30:00+00:00", "EC202: Signals & Systems Class (Dr. Gupta)"),
            (f"{tomorrow_str}T10:00:00+00:00", f"{tomorrow_str}T11:30:00+00:00", "CS101: Computer Programming Tutorial"),
        ]),
        ("Lecture Hall LT-2", [
            (f"{today_str}T09:30:00+00:00", f"{today_str}T11:00:00+00:00", "MA101: Linear Algebra & Calculus Class"),
            (f"{today_str}T15:00:00+00:00", f"{today_str}T16:30:00+00:00", "PH102: Quantum Physics Lecture"),
            (f"{tomorrow_str}T09:30:00+00:00", f"{tomorrow_str}T11:00:00+00:00", "MA101: Calculus Problem Solving Session"),
        ]),
        ("SAC Music Room", [
            (f"{today_str}T16:00:00+00:00", f"{today_str}T18:00:00+00:00", "Music Club: Band Rehearsal & Jamming"),
            (f"{today_str}T18:30:00+00:00", f"{today_str}T20:30:00+00:00", "Vocal Practice & Acoustic Guitar Session"),
            (f"{tomorrow_str}T17:00:00+00:00", f"{tomorrow_str}T19:00:00+00:00", "LNMIIT Cultural Fest Auditions"),
        ]),
        ("SAC Dance & Activity Room", [
            (f"{today_str}T17:00:00+00:00", f"{today_str}T19:00:00+00:00", "Vividha Dance Club Choreography Rehearsal"),
            (f"{tomorrow_str}T17:00:00+00:00", f"{tomorrow_str}T19:30:00+00:00", "Hip-Hop Dance Workshop (SAC)"),
        ]),
    ]

    for res_name, slots in sample_schedules:
        res = (await db.execute(select(Resource).where(Resource.name == res_name))).scalar_one_or_none()
        if res:
            for start_iso, end_iso, purpose in slots:
                s_dt = datetime.fromisoformat(start_iso)
                e_dt = datetime.fromisoformat(end_iso)
                # Avoid duplicate slot insertion
                clash = (await db.execute(
                    select(Booking).where(
                        Booking.resource_id == res.id,
                        Booking.start_time == s_dt,
                        Booking.status == BookingStatus.confirmed
                    )
                )).scalar_one_or_none()
                if not clash:
                    b = Booking(
                        user_id=seed_user.id,
                        resource_id=res.id,
                        start_time=s_dt,
                        end_time=e_dt,
                        purpose=purpose,
                        status=BookingStatus.confirmed,
                    )
                    db.add(b)
    await db.commit()


async def run_auto_seed():
    try:
        async with AsyncSessionLocal() as db:
            for item in SEED_RESOURCES:
                existing = await db.execute(select(Resource).where(Resource.name == item["name"]))
                if not existing.scalar_one_or_none():
                    db.add(Resource(**item))
            await db.commit()
            await seed_sample_classes(db)
            print("[AUTO-SEED] Resources and sample classes/events seeded successfully!")
    except Exception as e:
        print(f"[AUTO-SEED ERROR]: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    await run_auto_seed()
    start_scheduler()
    yield


app = FastAPI(
    title="CampusDesk API",
    description="Campus resource booking system for LNMIIT",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend Vercel & dev server requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Global error handler — consistent JSON envelope
# ---------------------------------------------------------------------------

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import logging
    logging.getLogger("uvicorn.error").error(f"Unhandled Exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Server Error: {str(exc)}"},
    )


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(auth.router)
app.include_router(resources.router)
app.include_router(bookings.router)
app.include_router(admin.router)


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/health/email", tags=["health"])
async def health_email():
    """Diagnostic: check SMTP & HTTP email config loaded on this instance."""
    return {
        "smtp_host": settings.SMTP_HOST,
        "smtp_port": settings.SMTP_PORT,
        "smtp_user": settings.SMTP_USER,
        "smtp_pass_set": bool(settings.SMTP_PASS),
        "brevo_api_key_set": bool(settings.BREVO_API_KEY),
        "brevo_api_key_last4": settings.BREVO_API_KEY[-4:] if settings.BREVO_API_KEY else "NOT SET",
        "resend_api_key_set": bool(settings.RESEND_API_KEY),
        "email_from": settings.EMAIL_FROM,
    }


@app.get("/api/seed", tags=["seed"])
async def force_seed():
    """Manually trigger seeding of LNMIIT campus resources and sample classes."""
    async with AsyncSessionLocal() as db:
        for item in SEED_RESOURCES:
            existing = await db.execute(select(Resource).where(Resource.name == item["name"]))
            if not existing.scalar_one_or_none():
                db.add(Resource(**item))
        await db.commit()
        await seed_sample_classes(db)
    return {"message": "LNMIIT Campus Resources and sample classes seeded successfully!"}


