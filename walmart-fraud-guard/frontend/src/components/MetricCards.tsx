import React from "react";
import { Analytics } from "../types";

interface MetricCardsProps {
  analytics: Analytics | null;
  loading: boolean;
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  analytics,
  loading,
}) => {
  if (loading || !analytics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="bg-gray-200 rounded-lg p-4 h-24 animate-pulse"
          />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Total Transactions",
      value: analytics.total_transactions,
      color: "bg-blue-50",
      textColor: "text-blue-600",
    },
    {
      label: "Fraud Count",
      value: analytics.fraud_count,
      color: "bg-red-50",
      textColor: "text-red-600",
    },
    {
      label: "Fraud Rate",
      value: `${(analytics.fraud_rate * 100).toFixed(1)}%`,
      color: "bg-orange-50",
      textColor: "text-orange-600",
    },
    {
      label: "High Alerts",
      value: analytics.high_alerts,
      color: "bg-yellow-50",
      textColor: "text-yellow-600",
    },
    {
      label: "Critical Alerts",
      value: analytics.critical_alerts,
      color: "bg-red-100",
      textColor: "text-red-700",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className={`${card.color} rounded-lg p-4 border border-gray-200`}
        >
          <p className="text-sm text-gray-600 mb-2">{card.label}</p>
          <p className={`text-2xl font-bold ${card.textColor}`}>{card.value}</p>
        </div>
      ))}
    </div>
  );
};
