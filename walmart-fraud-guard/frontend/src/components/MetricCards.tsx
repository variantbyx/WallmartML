import React from "react";
import type { AnalyticsSummary } from "../types";

interface MetricCardsProps {
  summary: AnalyticsSummary | null;
  loading: boolean;
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  summary,
  loading,
}) => {
  if (loading || !summary) {
    return (
      <div className="grid gap-4 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-[1.5rem] border border-white/70 bg-white/70"
          />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Total Transactions",
      value: summary.total_transactions.toLocaleString(),
      accent: "from-slate-900 to-slate-700",
    },
    {
      label: "Total Alerts",
      value: summary.total_alerts.toLocaleString(),
      accent: "from-red-600 to-rose-500",
    },
    {
      label: "High Risk",
      value: summary.high_risk_alerts.toLocaleString(),
      accent: "from-orange-500 to-amber-400",
    },
    {
      label: "Critical Risk",
      value: summary.critical_alerts.toLocaleString(),
      accent: "from-fuchsia-600 to-pink-500",
    },
    {
      label: "False Positive Rate",
      value: `${(summary.false_positive_rate * 100).toFixed(1)}%`,
      accent: "from-emerald-600 to-teal-500",
    },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-[1.75rem] bg-gradient-to-br ${card.accent} p-[1px] shadow-[0_20px_60px_rgba(15,23,42,0.12)]`}
        >
          <div className="h-full rounded-[1.7rem] border border-white/60 bg-white/90 p-4 backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {card.label}
            </p>
            <p className="mt-3 text-3xl font-black text-slate-900">
              {card.value}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Window: last {summary.window_hours} hours
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
