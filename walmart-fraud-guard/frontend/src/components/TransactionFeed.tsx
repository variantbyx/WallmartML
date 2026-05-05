import React from "react";
import { FraudAlert } from "../types";
import { formatDistanceToNow } from "date-fns";

interface TransactionFeedProps {
  alerts: FraudAlert[];
  onAlertClick: (alert: FraudAlert) => void;
  onDismiss: (transactionId: string) => void;
}

export const TransactionFeed: React.FC<TransactionFeedProps> = ({
  alerts,
  onAlertClick,
  onDismiss,
}) => {
  if (alerts.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <p className="text-gray-500">
          No fraud alerts yet. Waiting for suspicious transactions...
        </p>
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
      <h2 className="text-xl font-bold">Recent Alerts ({alerts.length})</h2>
      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.transaction_id}
            className={`border-l-4 rounded-lg p-4 cursor-pointer hover:shadow-md transition ${getRiskColor(
              alert.risk_level,
            )}`}
            onClick={() => onAlertClick(alert)}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <div className="flex gap-2 items-center mb-1">
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded ${getRiskBadgeColor(alert.risk_level)}`}
                  >
                    {alert.risk_level}
                  </span>
                  <span className="text-sm text-gray-600">
                    {formatDistanceToNow(new Date(alert.timestamp), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <p className="font-mono text-sm text-gray-700">
                  Account: {alert.account_id}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss(alert.transaction_id);
                }}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">
                Amount: ${alert.amount.toFixed(2)}
              </p>
              <p className="text-xs text-gray-700 line-clamp-2">
                {alert.explanation.summary}
              </p>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAlertClick(alert);
                }}
                className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
              >
                Review Alert
              </button>
              {(alert.analyst_review?.resolution === "confirmed_fraud" ||
                alert.analyst_review?.resolution === "false_positive") && (
                <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded">
                  ✓ Reviewed
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
