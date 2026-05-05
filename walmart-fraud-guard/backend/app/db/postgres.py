import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, Index, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.core.config import settings


class Base(DeclarativeBase):
    pass


class FraudEvent(Base):
    __tablename__ = "fraud_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    transaction_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    user_id: Mapped[str] = mapped_column(String(255), nullable=False)
    risk_score: Mapped[float] = mapped_column(Numeric(5, 4), nullable=False)
    risk_level: Mapped[str] = mapped_column(String(20), nullable=False)
    is_confirmed_fraud: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    model_version: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewer_id: Mapped[str | None] = mapped_column(String(255), nullable=True)


Index("idx_fraud_events_user", FraudEvent.user_id)
Index("idx_fraud_events_created", FraudEvent.created_at.desc())
Index("idx_fraud_events_risk", FraudEvent.risk_level)


_engine = create_async_engine(settings.postgres_dsn, future=True)
_session_factory = async_sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)


async def init_postgres() -> None:
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_postgres() -> None:
    await _engine.dispose()


async def get_pg_session() -> AsyncGenerator[AsyncSession, None]:
    async with _session_factory() as session:
        yield session
