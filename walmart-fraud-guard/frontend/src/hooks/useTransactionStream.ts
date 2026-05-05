import { useEffect, useState, useCallback, useRef } from "react";
import { FraudAlert, DriftAlert } from "../types";

export function useTransactionStream() {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [driftAlert, setDriftAlert] = useState<DriftAlert | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/alerts`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connected");
      setConnected(true);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setConnected(false);
      // Attempt reconnect in 5 seconds
      setTimeout(() => {
        console.log("Attempting to reconnect WebSocket...");
      }, 5000);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "fraud_alert") {
          setAlerts((prev) => [data, ...prev].slice(0, 100));
        } else if (data.type === "drift_alert") {
          setDriftAlert(data);
          // Clear drift alert after 10 seconds if no new ones
          setTimeout(() => setDriftAlert(null), 10000);
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };

    wsRef.current = ws;

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  const dismissAlert = useCallback((transactionId: string) => {
    setAlerts((prev) => prev.filter((a) => a.transaction_id !== transactionId));
  }, []);

  return { alerts, driftAlert, connected, dismissAlert };
}
