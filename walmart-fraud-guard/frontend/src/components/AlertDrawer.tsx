import React, { useState } from "react";
import { FraudAlert } from "../types";
import { AnalystReview } from "./AnalystReview";

interface AlertDrawerProps {
  alert: FraudAlert | null;
  onClose: () => void;
  onReview: (alert: FraudAlert, flag: boolean, notes: string) => void;
}

export const AlertDrawer: React.FC<AlertDrawerProps> = ({
  alert,
  onClose,
  onReview,
}) => {
  const [showReview, setShowReview] = useState(false);

  if (!alert) return null;

  const riskColors = {
    LOW: "text-green-600 bg-green-50",
    MEDIUM: "text-yellow-600 bg-yellow-50",
    HIGH: "text-orange-600 bg-orange-50",
    CRITICAL: "text-red-600 bg-red-50",
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
      <div className="bg-white w-full max-w-md h-screen max-h-[90vh] shadow-lg rounded-t-lg overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-red-600 to-red-700 text-white p-4 flex justify-between items-center">
          <h2 className="text-lg font-bold">Fraud Alert</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-red-800 rounded p-1 transition"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Transaction Info */}
          <div className="border-l-4 border-red-500 pl-4">
            <p className="text-sm text-gray-600">Account ID</p>
            <p className="font-mono text-sm">{alert.account_id}</p>
            <p className="text-sm text-gray-600 mt-2">Amount</p>
            <p className="text-lg font-bold">${alert.amount.toFixed(2)}</p>
          </div>

          {/* Risk Score */}
          <div>
            <p className="text-sm text-gray-600 mb-2">Risk Score</p>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  alert.risk_score > 0.9
                    ? "bg-red-600"
                    : alert.risk_score > 0.75
                      ? "bg-orange-500"
                      : "bg-yellow-500"
                }`}
                style={{ width: `${alert.risk_score * 100}%` }}
              />
            </div>
            <p
              className={`text-lg font-bold mt-2 ${riskColors[alert.risk_level]}`}
            >
              {alert.risk_level} RISK ({(alert.risk_score * 100).toFixed(1)}%)
            </p>
          </div>

          {/* SHAP Explanation */}
          <div>
            <h3 className="font-semibold mb-3">Feature Attribution (SHAP)</h3>
            <div className="space-y-3">
              {Object.entries(alert.explanation.features)
                .sort(
                  ([, a], [, b]) =>
                    parseFloat(b.contribution) - parseFloat(a.contribution),
                )
                .slice(0, 3)
                .map(([feature, data]) => (
                  <div
                    key={feature}
                    className="bg-gray-50 p-3 rounded border border-gray-200"
                  >
                    <p className="font-mono text-xs text-gray-500 mb-1">
                      {feature}
                    </p>
                    <p className="text-sm font-semibold">{data.value}</p>
                    <p
                      className={`text-xs ${
                        data.impact === "high"
                          ? "text-red-600"
                          : "text-orange-600"
                      }`}
                    >
                      Impact: {data.impact.toUpperCase()} ({data.contribution})
                    </p>
                  </div>
                ))}
            </div>
          </div>

          {/* LLM Narrative Explanation */}
          <div>
            <h3 className="font-semibold mb-2">Why This Alert?</h3>
            <p className="text-sm text-gray-700 leading-relaxed bg-blue-50 p-3 rounded border border-blue-200">
              {alert.explanation.summary}
            </p>
          </div>

          {/* Risk Factors */}
          <div>
            <h3 className="font-semibold mb-2">Risk Factors</h3>
            <ul className="space-y-2">
              {alert.explanation.risk_factors.map((factor, idx) => (
                <li key={idx} className="text-sm flex gap-2">
                  <span className="text-red-500 font-bold">•</span>
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Analyst Review Buttons */}
          {!showReview && (
            <div className="flex gap-2 pt-4 border-t">
              <button
                onClick={() => setShowReview(true)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition"
              >
                Review
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded transition"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Review Form */}
          {showReview && (
            <AnalystReview
              alert={alert}
              onSubmit={(flag, notes) => {
                onReview(alert, flag, notes);
                setShowReview(false);
              }}
              onCancel={() => setShowReview(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
};
