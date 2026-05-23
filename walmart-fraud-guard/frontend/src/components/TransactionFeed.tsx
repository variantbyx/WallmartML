import React from "react";
import type { RecentAlert } from "../types";
import { formatDistanceToNow } from "date-fns";

interface TransactionFeedProps {
  alerts: RecentAlert[];
  onAlertClick: (alert: RecentAlert) => void;
  onDismiss: (transactionId: string) => void;
}

export const TransactionFeed: React.FC<TransactionFeedProps> = ({
  alerts,
  onAlertClick,
  onDismiss,
}) => {
  if (alerts.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center text-slate-500">
        No live alerts yet. Submit a transaction to see the feed update in real
        time.
      </div>
    );
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "CRITICAL":
        return "border-red-500 bg-red-50";
      case "HIGH":
        return "border-orange-500 bg-orange-50";
      case "MEDIUM":
        return "border-yellow-500 bg-yellow-50";
      default:
        return "border-green-500 bg-green-50";
    }
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case "CRITICAL":
        return "bg-red-600 text-white";
      case "HIGH":
        return "bg-orange-500 text-white";
      case "MEDIUM":
        return "bg-yellow-500 text-gray-900";
      default:
        return "bg-green-500 text-white";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900">Recent Alerts</h2>
          <p className="text-sm text-slate-500">
            Live websocket feed plus the latest stored alerts.
          </p>
        </div>
        <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700">
          {alerts.length} items
        </div>
      </div>
      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.transaction_id}
            className={`cursor-pointer rounded-[1.5rem] border-l-4 p-4 transition hover:-translate-y-0.5 hover:shadow-lg ${getRiskColor(alert.risk_level)}`}
            onClick={() => onAlertClick(alert)}
          >
            <div className="mb-3 flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded ${getRiskBadgeColor(alert.risk_level)}`}
                  >
                    {alert.risk_level}
                  </span>
                  <span className="text-sm text-gray-600">
                    {formatDistanceToNow(new Date(alert.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <p className="font-mono text-sm text-gray-700">
                  User: {alert.user_id}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss(alert.transaction_id);
                }}
                className="text-lg text-gray-400 transition hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                <span>Risk score</span>
                <span>{(alert.risk_score * 100).toFixed(1)}%</span>
              </div>
              {typeof alert.amount === "number" ? (
                <p className="text-sm font-semibold text-slate-800">
                  Amount: ${alert.amount.toFixed(2)}
                </p>
              ) : null}
              <p className="line-clamp-2 text-sm text-slate-600">
                {alert.explanation || "No explanation captured yet."}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAlertClick(alert);
                }}
                className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white transition hover:bg-black"
              >
                Review Alert
              </button>
              {alert.is_confirmed_fraud !== null &&
              alert.is_confirmed_fraud !== undefined ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Reviewed by {alert.reviewer_id || "analyst"}
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
