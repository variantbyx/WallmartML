import React from "react";
import { DriftAlert } from "../types";

interface DriftBannerProps {
  alert: DriftAlert | null;
}

export const DriftBanner: React.FC<DriftBannerProps> = ({ alert }) => {
  if (!alert) return null;

  const severityColors = {
    low: "bg-yellow-50 border-yellow-200 text-yellow-800",
    medium: "bg-orange-50 border-orange-200 text-orange-800",
    high: "bg-red-50 border-red-200 text-red-800",
  };

  return (
    <div
      className={`border rounded-lg p-4 mb-6 ${severityColors[alert.severity]}`}
    >
      <div className="flex items-start gap-3">
        <div className="text-lg">⚠️</div>
        <div>
          <h3 className="font-semibold mb-1">{alert.message}</h3>
          <p className="text-sm mb-2">
            Drifted Features: {alert.drifted_features.join(", ")}
          </p>
          <p className="text-xs opacity-75">
            Severity: {alert.severity.toUpperCase()} — Consider retraining the
            model
          </p>
        </div>
      </div>
    </div>
  );
};
