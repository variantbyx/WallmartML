import asyncio
import json
from datetime import UTC, datetime

from fastapi import WebSocket
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models.alert import AlertPayload, FraudResult


class NotifierService:
    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()

    async def register(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.add(websocket)

    def unregister(self, websocket: WebSocket) -> None:
        self._connections.discard(websocket)

    async def fire(self, result: FraudResult, db: AsyncIOMotorDatabase) -> None:
        payload = AlertPayload(
            transaction_id=result.transaction_id,
            user_id=result.user_id,
            risk_level=result.risk_level,
            risk_score=result.risk_score,
            explanation=result.explanation,
            created_at=datetime.now(UTC),
        )
        await db.alerts.insert_one(payload.model_dump())
        await self._broadcast(payload)

    async def _broadcast(self, payload: AlertPayload) -> None:
        if not self._connections:
            return

        data = json.dumps(payload.model_dump(mode="json"))
        dead_connections: list[WebSocket] = []

        for conn in self._connections:
            try:
                await conn.send_text(data)
            except Exception:
                dead_connections.append(conn)

        for conn in dead_connections:
            self.unregister(conn)

    async def send_email(self, to_email: str, payload: AlertPayload) -> None:
        await asyncio.sleep(0)
        print(f"Email alert (stub) to {to_email}: {payload.model_dump_json()}")


notifier_service = NotifierService()
