import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
import json

router = APIRouter(tags=["websocket"])

class ConnectionManager:
    """Manages WebSocket connections and broadcasts fraud alerts."""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        """Accept and register a new WebSocket connection."""
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"Client connected. Total clients: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        """Remove a disconnected client."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"Client disconnected. Total clients: {len(self.active_connections)}")
    
    async def broadcast_fraud_alert(self, alert: dict):
        """Broadcast a fraud alert to all connected clients."""
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_json(alert)
            except Exception as e:
                print(f"Error sending alert: {e}")
                dead_connections.append(connection)
        
        # Clean up dead connections
        for connection in dead_connections:
            self.disconnect(connection)
    
    async def broadcast_drift_alert(self, alert: dict):
        """Broadcast a drift detection alert to all connected clients."""
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_json(alert)
            except Exception as e:
                print(f"Error sending drift alert: {e}")
                dead_connections.append(connection)
        
        for connection in dead_connections:
            self.disconnect(connection)

# Global connection manager instance
manager = ConnectionManager()

@router.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    """
    WebSocket endpoint for real-time fraud alerts.
    Clients connect here to receive live push notifications.
    """
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive with periodic ping messages
            await asyncio.sleep(30)
            try:
                await websocket.send_json({"type": "ping"})
            except:
                break
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)
