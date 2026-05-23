import React, { useState } from "react";
import type { RecentAlert } from "../types";
import { AnalystReview } from "./AnalystReview";

interface AlertDrawerProps {
  alert: RecentAlert | null;
  reviewerId: string;
  busy?: boolean;
  onClose: () => void;
  onReview: (alert: RecentAlert, flag: boolean, reviewerId: string) => void;
}

export const AlertDrawer: React.FC<AlertDrawerProps> = ({
  alert,
  reviewerId,
  busy = false,
  onClose,
  onReview,
}) => {
  const [showReview, setShowReview] = useState(false);

  if (!alert) return null;

  const riskClasses: Record<RecentAlert["risk_level"], string> = {
    LOW: "text-emerald-700 bg-emerald-50 border-emerald-200",
    MEDIUM: "text-amber-700 bg-amber-50 border-amber-200",
    HIGH: "text-orange-700 bg-orange-50 border-orange-200",
    CRITICAL: "text-red-700 bg-red-50 border-red-200",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/60 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close alert drawer"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <div className="relative ml-auto h-screen max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] bg-white shadow-[0_30px_100px_rgba(15,23,42,0.35)]">
        <div className="sticky top-0 flex items-center justify-between bg-gradient-to-r from-red-600 to-rose-600 px-5 py-4 text-white">
          <div>
            <h2 className="text-lg font-black">Fraud Alert</h2>
            <p className="text-xs uppercase tracking-[0.2em] text-red-100">
              Interactive review panel
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/20 px-3 py-1 text-sm font-semibold transition hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Transaction ID
              </p>
              <p className="mt-1 font-mono text-sm text-slate-900">
                {alert.transaction_id}
              </p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                User ID
              </p>
              <p className="mt-1 font-mono text-sm text-slate-900">
                {alert.user_id}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Risk Score
              </p>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-3 rounded-full transition-all ${
                    alert.risk_score > 0.9
                      ? "bg-red-600"
                      : alert.risk_score > 0.75
                        ? "bg-orange-500"
                        : alert.risk_score > 0.5
                          ? "bg-amber-400"
                          : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(100, alert.risk_score * 100)}%` }}
                />
              </div>
              <p
                className={`mt-2 rounded-2xl border px-3 py-2 text-sm font-black ${riskClasses[alert.risk_level]}`}
              >
                {alert.risk_level} RISK ({(alert.risk_score * 100).toFixed(1)}%)
              </p>
              {typeof alert.amount === "number" ? (
                <p className="mt-2 text-sm text-slate-600">
                  Amount: ${alert.amount.toFixed(2)}
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 font-semibold text-slate-900">
              Why this alert fired
            </h3>
            <p className="leading-7 text-slate-600">
              {alert.explanation ||
                "No explanation captured for this alert yet."}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
            {alert.is_confirmed_fraud === null ||
            alert.is_confirmed_fraud === undefined ? (
              <p>Review status: not yet reviewed.</p>
            ) : (
              <p>
                Reviewed by{" "}
                <span className="font-semibold text-slate-900">
                  {alert.reviewer_id || reviewerId}
                </span>{" "}
                as{" "}
                <span className="font-semibold text-slate-900">
                  {alert.is_confirmed_fraud
                    ? "CONFIRMED_FRAUD"
                    : "FALSE_POSITIVE"}
                </span>
              </p>
            )}
          </div>

          {!showReview ? (
            <div className="flex gap-2 border-t border-slate-200 pt-4">
              <button
                onClick={() => setShowReview(true)}
                className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                disabled={busy}
              >
                {busy ? "Submitting..." : "Review Alert"}
              </button>
              <button
                onClick={onClose}
                className="flex-1 rounded-2xl bg-slate-200 px-4 py-3 font-semibold text-slate-800 transition hover:bg-slate-300"
              >
                Dismiss
              </button>
            </div>
          ) : (
            <AnalystReview
              alert={alert}
              defaultReviewerId={reviewerId}
              onSubmit={(flag, submittedReviewerId) => {
                onReview(alert, flag, submittedReviewerId);
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
