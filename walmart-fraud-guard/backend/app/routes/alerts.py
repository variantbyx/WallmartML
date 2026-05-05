import json

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.db.mongo import get_mongo_db
from app.services.notifier import notifier_service

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("/recent")
async def get_recent_alerts(db: AsyncIOMotorDatabase = Depends(get_mongo_db), limit: int = 50) -> list[dict]:
    cursor = db.alerts.find({}, {"_id": 0}).sort("created_at", -1).limit(limit)
    return await cursor.to_list(length=limit)


@router.websocket("/stream")
async def alert_stream(websocket: WebSocket) -> None:
    await notifier_service.register(websocket)
    try:
        while True:
            msg = await websocket.receive_text()
            # Echo heartbeat pings so client can keep connection alive.
            if msg.strip().lower() == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        notifier_service.unregister(websocket)
    except Exception:
        notifier_service.unregister(websocket)
