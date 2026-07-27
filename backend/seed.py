"""
Seed script: Replaces all resources with LNMIIT campus resources,
seeds users, and pre-seeds sample class schedules for Lecture Halls.
Run: python seed.py
"""
import asyncio
import sys
import os
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(__file__))

from app.database import AsyncSessionLocal, Base, engine
from app.models import Resource, ResourceCategory, User, UserRole, Booking, BookingStatus


USERS = [
    {"name": "Admin LNMIIT", "email": "admin@lnmiit.ac.in", "role": UserRole.admin},
    {"name": "Ronak Jain", "email": "ronak@lnmiit.ac.in", "role": UserRole.student},
    {"name": "Priya Sharma", "email": "priya@lnmiit.ac.in", "role": UserRole.student},
]

RESOURCES = [
    # --- Halls ---
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

    # --- Equipment ---
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

    # --- Rooms ---
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

    # --- Other ---
    {
        "name": "SAC Music Room",
        "description": "Soundproof practice space equipped with drum set, keyboards, amplifiers, and acoustic guitars.",
        "location": "Student Activity Centre (SAC)",
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


async def seed():
    print("Refreshing database schema...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Seed users
        admin_user = None
        for user_data in USERS:
            u = User(**user_data)
            db.add(u)
            if u.role == UserRole.admin:
                admin_user = u
        await db.flush()

        # Seed resources
        resource_map = {}
        for res_data in RESOURCES:
            r = Resource(**res_data)
            db.add(r)
            await db.flush()
            resource_map[r.name] = r
            print(f"  + Resource: {r.name} ({r.category.value})")

        # Seed sample class schedules for LT-1 and LT-2 for today & tomorrow
        now = datetime.now(timezone.utc)
        today_date = now.date()
        tomorrow_date = today_date + timedelta(days=1)

        lt1 = resource_map.get("Lecture Hall LT-1")
        lt2 = resource_map.get("Lecture Hall LT-2")

        sample_classes = [
            # LT-1 Classes
            (lt1, today_date, 9, 30, 11, 0, "CS101: Computer Programming Lecture"),
            (lt1, today_date, 11, 30, 13, 0, "EC201: Digital Electronics Lecture"),
            (lt1, today_date, 14, 0, 15, 30, "MTH102: Linear Algebra Lecture"),
            (lt1, tomorrow_date, 9, 30, 11, 0, "CS101: Computer Programming Lecture"),
            (lt1, tomorrow_date, 11, 30, 13, 0, "EC201: Digital Electronics Lecture"),

            # LT-2 Classes
            (lt2, today_date, 10, 0, 11, 30, "CS202: Data Structures Lecture"),
            (lt2, today_date, 12, 0, 13, 30, "PHY101: Engineering Physics Lecture"),
            (lt2, today_date, 15, 0, 16, 30, "HSS101: Technical Communication"),
            (lt2, tomorrow_date, 10, 0, 11, 30, "CS202: Data Structures Lecture"),
        ]

        for res, date_obj, s_h, s_m, e_h, e_m, purpose in sample_classes:
            if res:
                s_dt = datetime(date_obj.year, date_obj.month, date_obj.day, s_h, s_m, tzinfo=timezone.utc)
                e_dt = datetime(date_obj.year, date_obj.month, date_obj.day, e_h, e_m, tzinfo=timezone.utc)
                booking = Booking(
                    user_id=admin_user.id,
                    resource_id=res.id,
                    start_time=s_dt,
                    end_time=e_dt,
                    purpose=purpose,
                    status=BookingStatus.confirmed,
                )
                db.add(booking)
                print(f"  + Sample Class: {res.name} | {s_h}:{s_m:02d}-{e_h}:{e_m:02d} | {purpose}")

        await db.commit()
        print("\nLNMIIT Resources & Sample Class Schedules Seeded Successfully!")


if __name__ == "__main__":
    asyncio.run(seed())
