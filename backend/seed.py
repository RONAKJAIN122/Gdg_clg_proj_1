"""
Seed script: inserts 1 admin, 2 students, and 6 resources.
Run from the backend/ directory: python seed.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.database import AsyncSessionLocal, Base, engine
from app.models import Resource, ResourceCategory, User, UserRole


USERS = [
    {"name": "Admin LNMIIT", "email": "admin@lnmiit.ac.in", "role": UserRole.admin},
    {"name": "Ronak Jain", "email": "ronak@lnmiit.ac.in", "role": UserRole.student},
    {"name": "Priya Sharma", "email": "priya@lnmiit.ac.in", "role": UserRole.student},
]

RESOURCES = [
    {
        "name": "Main Seminar Hall",
        "description": "Large seminar hall with projector, PA system and 200-seat capacity.",
        "location": "Academic Block A, Ground Floor",
        "category": ResourceCategory.hall,
        "open_time": "08:00",
        "close_time": "22:00",
    },
    {
        "name": "Music Room",
        "description": "Soundproofed room with guitars, keyboard, and drum kit.",
        "location": "Student Activity Centre, Room 102",
        "category": ResourceCategory.room,
        "open_time": "10:00",
        "close_time": "20:00",
    },
    {
        "name": "DSLR Camera Kit",
        "description": "Canon EOS 5D Mark IV with 24–70mm lens, tripod, and carry bag.",
        "location": "Media Lab, Academic Block B",
        "category": ResourceCategory.equipment,
        "open_time": "09:00",
        "close_time": "18:00",
    },
    {
        "name": "Portable Projector",
        "description": "Full-HD 4000-lumen portable projector with HDMI and wireless connectivity.",
        "location": "Equipment Store, Block C",
        "category": ResourceCategory.equipment,
        "open_time": "09:00",
        "close_time": "21:00",
    },
    {
        "name": "Open Air Amphitheatre",
        "description": "400-person outdoor venue with built-in stage and lighting rig.",
        "location": "Central Lawn, Main Campus",
        "category": ResourceCategory.hall,
        "open_time": "07:00",
        "close_time": "23:00",
    },
    {
        "name": "Discussion Room 1",
        "description": "Small 10-person discussion room with whiteboard and TV display.",
        "location": "Library Building, 1st Floor",
        "category": ResourceCategory.room,
        "open_time": "08:00",
        "close_time": "21:00",
    },
    {
        "name": "Photography Lighting Kit",
        "description": "Studio lighting set: 3 softboxes, reflectors, and backdrops.",
        "location": "Media Lab, Academic Block B",
        "category": ResourceCategory.equipment,
        "open_time": "09:00",
        "close_time": "18:00",
    },
    {
        "name": "Innovation Lab",
        "description": "Equipped with 3D printers, soldering stations, and electronics components.",
        "location": "Block D, Ground Floor",
        "category": ResourceCategory.room,
        "open_time": "09:00",
        "close_time": "22:00",
    },
]


async def seed():
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Seed users
        from sqlalchemy import select
        for user_data in USERS:
            result = await db.execute(select(User).where(User.email == user_data["email"]))
            existing = result.scalar_one_or_none()
            if not existing:
                db.add(User(**user_data))
                print(f"  + User: {user_data['email']} ({user_data['role'].value})")
            else:
                print(f"  ~ User already exists: {user_data['email']}")

        # Seed resources
        for res_data in RESOURCES:
            result = await db.execute(select(Resource).where(Resource.name == res_data["name"]))
            existing = result.scalar_one_or_none()
            if not existing:
                db.add(Resource(**res_data))
                print(f"  + Resource: {res_data['name']}")
            else:
                print(f"  ~ Resource already exists: {res_data['name']}")

        await db.commit()
        print("\nSeed complete!")


if __name__ == "__main__":
    print("Seeding CampusDesk database...")
    asyncio.run(seed())
