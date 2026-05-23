import React from "react";
import type { DriftReport } from "../types";

interface DriftBannerProps {
  report: DriftReport | null;
}

export const DriftBanner: React.FC<DriftBannerProps> = ({ report }) => {
  if (!report) return null;

  const severityColors = {
    low: "bg-amber-50 border-amber-200 text-amber-900",
    medium: "bg-orange-50 border-orange-200 text-orange-900",
    high: "bg-red-50 border-red-200 text-red-900",
  };

  return (
    <div
      className={`rounded-[1.75rem] border p-5 ${severityColors[report.severity]}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">
            Drift monitor
          </p>
          <h3 className="mt-1 text-xl font-black">
            {report.retrain_recommended
              ? "Retraining recommended"
              : "Feature drift within range"}
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 opacity-90">
            {report.has_drift
              ? `Detected drift in ${report.drifted_feature_count} feature(s) across a sample of ${report.sample_size.toLocaleString()} events.`
              : "No significant drift was detected in the current window."}
          </p>
        </div>
        <div className="rounded-2xl bg-white/70 px-4 py-3 text-sm font-semibold shadow-sm backdrop-blur">
          Severity: {report.severity.toUpperCase()}
        </div>
      </div>
      {report.drifted_features.length > 0 ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {report.drifted_features.slice(0, 6).map((feature) => (
            <div
              key={feature.feature}
              className="rounded-2xl bg-white/80 p-4 text-sm shadow-sm"
            >
              <div className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">
                {feature.feature}
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-slate-700">
                <span>z-score</span>
                <span className="font-bold">{feature.z_score.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};
