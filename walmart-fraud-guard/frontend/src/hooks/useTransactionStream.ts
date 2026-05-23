import { useCallback, useEffect, useRef, useState } from "react";
import { getApiErrorMessage, getRecentAlerts } from "../lib/api";
import type { DriftReport, RecentAlert, WSMessage } from "../types";

export function useTransactionStream() {
  const [alerts, setAlerts] = useState<RecentAlert[]>([]);
  const [driftAlert, setDriftAlert] = useState<DriftReport | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<number>(0);
  const reconnectTimerRef = useRef<number | null>(null);

  const normalizeAlert = (payload: Record<string, unknown>): RecentAlert => {
    const explanation = payload.explanation;
    let explanationText: string | null = null;

    if (typeof explanation === "string") {
      explanationText = explanation;
    } else if (explanation && typeof explanation === "object") {
      const explanationObject = explanation as {
        summary?: unknown;
        message?: unknown;
      };
      if (typeof explanationObject.summary === "string") {
        explanationText = explanationObject.summary;
      } else if (typeof explanationObject.message === "string") {
        explanationText = explanationObject.message;
      }
    }

    return {
      transaction_id: String(payload.transaction_id ?? ""),
      user_id: String(payload.user_id ?? payload.account_id ?? "unknown"),
      risk_level: (payload.risk_level as RecentAlert["risk_level"]) ?? "MEDIUM",
      risk_score: Number(payload.risk_score ?? 0),
      explanation: explanationText,
      is_confirmed_fraud:
        typeof payload.is_confirmed_fraud === "boolean"
          ? payload.is_confirmed_fraud
          : null,
      reviewer_id:
        typeof payload.reviewer_id === "string" ? payload.reviewer_id : null,
      reviewed_at:
        typeof payload.reviewed_at === "string" ? payload.reviewed_at : null,
      created_at:
        typeof payload.created_at === "string"
          ? payload.created_at
          : typeof payload.timestamp === "string"
            ? payload.timestamp
            : new Date().toISOString(),
      amount:
        typeof payload.amount === "number"
          ? payload.amount
          : typeof payload.amount === "string"
            ? Number(payload.amount)
            : undefined,
      model_version:
        typeof payload.model_version === "string"
          ? payload.model_version
          : undefined,
    };
  };

  const upsertAlert = useCallback((alert: RecentAlert) => {
    setAlerts((current) => {
      const filtered = current.filter(
        (item) => item.transaction_id !== alert.transaction_id,
      );
      return [alert, ...filtered].slice(0, 50);
    });
  }, []);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/alerts`;

    const connect = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setError(null);
        reconnectRef.current = 0;
      };

      ws.onclose = () => {
        setConnected(false);
        if (reconnectTimerRef.current) {
          window.clearTimeout(reconnectTimerRef.current);
        }
        reconnectRef.current += 1;
        const delay = Math.min(1000 * 2 ** reconnectRef.current, 16000);
        reconnectTimerRef.current = window.setTimeout(connect, delay);
      };

      ws.onerror = () => {
        setConnected(false);
        setError("WebSocket connection failed");
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WSMessage &
            Record<string, unknown>;

          if (message.type === "fraud_alert") {
            upsertAlert(normalizeAlert(message));
          } else if (message.type === "drift_alert") {
            setDriftAlert(message as unknown as DriftReport);
          } else if (message.type === "pong") {
            setError(null);
          }
        } catch (parseError) {
          setError(getApiErrorMessage(parseError));
        }
      };
    };

    connect();

    return () => {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [upsertAlert]);

  const dismissAlert = useCallback((transactionId: string) => {
    setAlerts((current) =>
      current.filter((alert) => alert.transaction_id !== transactionId),
    );
  }, []);

  const refreshAlerts = useCallback(async (token: string | null) => {
    try {
      const recentAlerts = await getRecentAlerts(token, 25);
      setAlerts(recentAlerts);
      setError(null);
    } catch (refreshError) {
      setError(getApiErrorMessage(refreshError));
    }
  }, []);

  return { alerts, driftAlert, connected, error, dismissAlert, refreshAlerts };
}
