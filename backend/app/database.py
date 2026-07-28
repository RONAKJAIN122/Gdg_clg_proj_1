from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# SQLite needs check_same_thread=False; PostgreSQL on Render needs ssl=False for internal connection
connect_args = {}
if "sqlite" in db_url:
    connect_args = {"check_same_thread": False}
elif "postgresql" in db_url:
    connect_args = {"ssl": False}

engine = create_async_engine(
    db_url,
    connect_args=connect_args,
    echo=(settings.APP_ENV == "development"),
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
