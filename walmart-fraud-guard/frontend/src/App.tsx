import { useEffect, useMemo, useState } from "react";
import { AlertDrawer } from "./components/AlertDrawer";
import { AuthScreen } from "./components/AuthScreen";
import { DriftBanner } from "./components/DriftBanner";
import { MetricCards } from "./components/MetricCards";
import { TransactionFeed } from "./components/TransactionFeed";
import { useAnalytics } from "./hooks/useAnalytics";
import { useTransactionStream } from "./hooks/useTransactionStream";
import { useAuthStore } from "./store/authStore";
import { analyzeTransaction, getApiErrorMessage, reviewAlert } from "./lib/api";
import type { FraudResult, RecentAlert, TransactionInput } from "./types";

type TransactionDraft = {
  id: string;
  user_id: string;
  merchant_id: string;
  amount: string;
  currency: string;
  account_age_days: string;
  total_orders: string;
  total_returns: string;
  avg_order_value: string;
  avg_return_value: string;
  transaction_timestamp: string;
  metadata: string;
};

type ActivityState = "pending" | "success" | "error" | "warning";

interface ActivityEntry {
  id: number;
  title: string;
  goal: string;
  detail: string;
  status: ActivityState;
}

const defaultDraft: TransactionDraft = {
  id: "txn-lab-1001",
  user_id: "user-new-123",
  merchant_id: "m-999",
  amount: "5000",
  currency: "USD",
  account_age_days: "3",
  total_orders: "2",
  total_returns: "2",
  avg_order_value: "2500",
  avg_return_value: "2450",
  transaction_timestamp: new Date().toISOString().slice(0, 16),
  metadata: JSON.stringify({ channel: "web", source: "manual-lab" }, null, 2),
};

const lowRiskDraft: TransactionDraft = {
  id: "txn-lab-2001",
  user_id: "user-trusted-456",
  merchant_id: "m-888",
  amount: "89.99",
  currency: "USD",
  account_age_days: "850",
  total_orders: "245",
  total_returns: "3",
  avg_order_value: "75",
  avg_return_value: "45",
  transaction_timestamp: new Date().toISOString().slice(0, 16),
  metadata: JSON.stringify({ channel: "web", source: "manual-lab" }, null, 2),
};

const duplicateDraft: TransactionDraft = {
  ...defaultDraft,
  id: "txn-duplicate-9001",
};

const burstDraft: TransactionDraft = {
  ...lowRiskDraft,
  id: "txn-burst-1",
  user_id: "user-rate-777",
};

function toTransactionInput(draft: TransactionDraft): TransactionInput {
  let metadata: Record<string, unknown> = {};

  try {
    metadata = draft.metadata.trim() ? JSON.parse(draft.metadata) : {};
  } catch {
    metadata = { raw: draft.metadata };
  }

  return {
    id: draft.id.trim(),
    user_id: draft.user_id.trim(),
    merchant_id: draft.merchant_id.trim() || null,
    amount: Number(draft.amount),
    currency: draft.currency.trim() || "USD",
    account_age_days: Number(draft.account_age_days),
    total_orders: Number(draft.total_orders),
    total_returns: Number(draft.total_returns),
    avg_order_value: Number(draft.avg_order_value),
    avg_return_value: Number(draft.avg_return_value),
    transaction_timestamp: new Date(draft.transaction_timestamp).toISOString(),
    metadata,
  };
}

function scenarioCardTone(status: ActivityState) {
  switch (status) {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "error":
      return "border-red-200 bg-red-50 text-red-800";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-800";
    default:
      return "border-slate-200 bg-white text-slate-700";
  }
}

export function App() {
  const { user, accessToken, isAuthenticated, logout } = useAuthStore();
  const [selectedAlert, setSelectedAlert] = useState<RecentAlert | null>(null);
  const [draft, setDraft] = useState<TransactionDraft>(defaultDraft);
  const [analysisResult, setAnalysisResult] = useState<FraudResult | null>(
    null,
  );
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [lastGoal, setLastGoal] = useState<string>(
    "Load a scenario and submit it from the lab.",
  );

  const {
    alerts,
    driftAlert,
    connected,
    error: wsError,
    dismissAlert,
    refreshAlerts,
  } = useTransactionStream();
  const {
    summary,
    driftReport,
    modelStatus,
    loading: analyticsLoading,
    error: analyticsError,
    refresh,
  } = useAnalytics();

  const currentReviewerId = user?.user_id ?? "analyst1";

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    void refreshAlerts(accessToken);
  }, [accessToken, refreshAlerts]);

  const combinedAlerts = useMemo(() => {
    const byId = new Map<string, RecentAlert>();

    [...alerts]
      .sort(
        (left, right) =>
          new Date(right.created_at).getTime() -
          new Date(left.created_at).getTime(),
      )
      .forEach((alert) => byId.set(alert.transaction_id, alert));

    return Array.from(byId.values());
  }, [alerts]);

  const addActivity = (entry: Omit<ActivityEntry, "id">) => {
    setActivityLog((current) =>
      [
        { id: Date.now() + Math.floor(Math.random() * 1000), ...entry },
        ...current,
      ].slice(0, 8),
    );
  };

  const updateDraft = (patch: Partial<TransactionDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const loadScenario = (nextDraft: TransactionDraft, goal: string) => {
    setDraft(nextDraft);
    setLastGoal(goal);
    addActivity({
      title: "Scenario loaded",
      goal,
      detail: nextDraft.id,
      status: "success",
    });
  };

  const submitAnalyze = async (overrideDraft?: TransactionDraft) => {
    const token = accessToken;
    if (!token) {
      return;
    }

    setAnalysisLoading(true);
    const payload = toTransactionInput(overrideDraft ?? draft);

    try {
      const result = await analyzeTransaction(token, payload);
      setAnalysisResult(result);

      const goal =
        result.risk_score >= 0.75
          ? "High risk should score HIGH/CRITICAL and surface explanation data."
          : "Low-risk transaction should stay below the high-risk threshold.";
      const passed = result.is_fraud === result.risk_score >= 0.5;

      addActivity({
        title: `Analyzed ${result.transaction_id}`,
        goal,
        detail: `${result.risk_level} · ${(result.risk_score * 100).toFixed(1)}% · model ${result.model_version}`,
        status: passed ? "success" : "warning",
      });

      setLastGoal(goal);
      await refreshAlerts(token);
      await refresh();
    } catch (error) {
      const message = getApiErrorMessage(error);
      const status = message.includes("Duplicate") ? "warning" : "error";

      addActivity({
        title: `Analyze failed for ${payload.id}`,
        goal: "Transaction scoring should return a valid fraud result or a duplicate conflict.",
        detail: message,
        status,
      });
    } finally {
      setAnalysisLoading(false);
    }
  };

  const runDuplicateTest = async () => {
    const duplicateScenario = duplicateDraft;
    setDraft(duplicateScenario);
    setLastGoal("The second submission must return a duplicate conflict.");

    await submitAnalyze(duplicateScenario);

    try {
      await analyzeTransaction(
        accessToken,
        toTransactionInput(duplicateScenario),
      );
      addActivity({
        title: "Duplicate test failed",
        goal: "The second submission must return a duplicate conflict.",
        detail:
          "Second request was accepted instead of returning 409 Conflict.",
        status: "error",
      });
    } catch (error) {
      addActivity({
        title: "Duplicate test passed",
        goal: "The second submission must return a duplicate conflict.",
        detail: getApiErrorMessage(error),
        status: "success",
      });
    }
  };

  const runBurstTest = async () => {
    if (!accessToken) {
      return;
    }

    const baseDraft = { ...burstDraft };
    setLastGoal(
      "The 11th request within one minute must return 429 Too Many Requests.",
    );
    addActivity({
      title: "Rate-limit test started",
      goal: "The 11th request within one minute must return 429 Too Many Requests.",
      detail: "Submitting 11 unique transactions for the same user.",
      status: "warning",
    });

    let hitLimit = false;
    for (let index = 0; index < 11; index += 1) {
      const payload = {
        ...baseDraft,
        id: `txn-burst-${index + 1}-${Date.now()}`,
      };

      try {
        await analyzeTransaction(accessToken, toTransactionInput(payload));
      } catch (error) {
        const message = getApiErrorMessage(error);
        if (message.includes("Too Many Requests") || message.includes("429")) {
          hitLimit = true;
          break;
        }
      }
    }

    addActivity({
      title: hitLimit ? "Rate-limit test passed" : "Rate-limit test failed",
      goal: "The 11th request within one minute must return 429 Too Many Requests.",
      detail: hitLimit
        ? "Backend enforced the burst limit."
        : "No 429 was returned during the burst test.",
      status: hitLimit ? "success" : "error",
    });

    await refreshAlerts(accessToken);
    await refresh();
  };

  const handleReview = async (
    alert: RecentAlert,
    flag: boolean,
    reviewerId: string,
  ) => {
    if (!accessToken) {
      return;
    }

    setReviewLoading(true);
    try {
      const response = await reviewAlert(accessToken, alert.transaction_id, {
        is_confirmed_fraud: flag,
        reviewer_id: reviewerId,
      });

      addActivity({
        title: `Reviewed ${response.transaction_id}`,
        goal: "Submitting a review should update the alert in the backend and refresh the UI.",
        detail: `${response.is_confirmed_fraud ? "CONFIRMED_FRAUD" : "FALSE_POSITIVE"} by ${response.reviewer_id}`,
        status: "success",
      });

      setSelectedAlert(null);
      dismissAlert(alert.transaction_id);
      await refreshAlerts(accessToken);
      await refresh();
    } catch (error) {
      addActivity({
        title: `Review failed for ${alert.transaction_id}`,
        goal: "Submitting a review should update the alert in the backend and refresh the UI.",
        detail: getApiErrorMessage(error),
        status: "error",
      });
    } finally {
      setReviewLoading(false);
    }
  };

  const openDocs = () =>
    window.open("http://localhost:8000/docs", "_blank", "noopener,noreferrer");

  if (!isAuthenticated()) {
    return <AuthScreen />;
  }

  const scenarioGoals = [
    {
      title: "High-risk fraud scoring",
      goal: "risk_level should be HIGH or CRITICAL and the response should include explanation and feature importance.",
      action: () =>
        loadScenario(
          defaultDraft,
          "risk_level should be HIGH or CRITICAL and the response should include explanation and feature importance.",
        ),
    },
    {
      title: "Low-risk fraud scoring",
      goal: "risk_level should stay LOW and the score should be below the high-risk threshold.",
      action: () =>
        loadScenario(
          lowRiskDraft,
          "risk_level should stay LOW and the score should be below the high-risk threshold.",
        ),
    },
    {
      title: "Duplicate detection",
      goal: "The first request should score, and the second should return a duplicate conflict.",
      action: () =>
        loadScenario(
          duplicateDraft,
          "The first request should score, and the second should return a duplicate conflict.",
        ),
    },
    {
      title: "Rate-limit burst",
      goal: "The 11th request in a 60-second burst should return 429 Too Many Requests.",
      action: () =>
        loadScenario(
          burstDraft,
          "The 11th request in a 60-second burst should return 429 Too Many Requests.",
        ),
    },
  ] as const;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.18),_transparent_25%),radial-gradient(circle_at_top_right,_rgba(245,158,11,0.14),_transparent_22%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] text-slate-900">
      <header className="border-b border-white/60 bg-white/70 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-red-600">
              Fraud Operations Console
            </p>
            <h1 className="text-2xl font-black text-slate-900">
              Walmart Fraud Guard
            </h1>
            <p className="text-sm text-slate-500">
              Interactive dashboard, manual test lab, and live fraud review
              workflow.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <span
                className={`h-3 w-3 rounded-full ${connected ? "bg-emerald-500" : "bg-red-500"}`}
              />
              {connected ? "Connected" : "Disconnected"}
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div className="text-sm font-medium text-slate-700">
              {user
                ? `${user.role === "admin" ? "Admin" : "Analyst"} · ${user.user_id}`
                : "Guest"}
            </div>
            <button
              type="button"
              onClick={() => void refresh()}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:text-red-700"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={openDocs}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:text-red-700"
            >
              API Docs
            </button>
            <button
              type="button"
              onClick={logout}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:text-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="mb-8 grid gap-6 rounded-[2rem] border border-white/60 bg-white/80 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-red-600">
              Full stack manual test bed
            </p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-900">
              Score transactions, force duplicates, trigger rate limits, inspect
              drift, and submit analyst reviews from one UI.
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              Use the lab below to exercise the actual backend endpoints and
              validate the full system, not just the API docs.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-slate-900 p-5 text-white shadow-lg">
              <div className="text-sm text-slate-300">API status</div>
              <div className="mt-2 text-3xl font-black">Live</div>
              <div className="mt-2 text-sm text-slate-300">
                WebSocket, scoring, review, drift, and model status all route
                through the backend.
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm text-slate-500">Current role</div>
              <div className="mt-2 text-3xl font-black text-slate-900">
                {user?.role === "admin" ? "Admin" : "Analyst"}
              </div>
              <div className="mt-2 text-sm text-slate-500">
                Signed in as {user?.user_id}
              </div>
            </div>
          </div>
        </section>

        <DriftBanner report={driftAlert ?? driftReport} />

        <MetricCards summary={summary} loading={analyticsLoading} />

        {wsError || analyticsError ? (
          <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            {wsError || analyticsError}
          </div>
        ) : null}

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-600">
                  Transaction lab
                </p>
                <h3 className="mt-2 text-2xl font-black text-slate-900">
                  Manual scoring and system verification
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Edit any field, send the payload, and inspect the returned
                  fraud result.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDraft(defaultDraft)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:text-red-700"
              >
                Reset form
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["id", "Transaction ID"],
                  ["user_id", "User ID"],
                  ["merchant_id", "Merchant ID"],
                  ["amount", "Amount"],
                  ["currency", "Currency"],
                  ["account_age_days", "Account age (days)"],
                  ["total_orders", "Total orders"],
                  ["total_returns", "Total returns"],
                  ["avg_order_value", "Avg order value"],
                  ["avg_return_value", "Avg return value"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="block text-sm font-semibold text-slate-700"
                >
                  {label}
                  <input
                    value={draft[key]}
                    onChange={(event) =>
                      updateDraft({
                        [key]: event.target.value,
                      } as Partial<TransactionDraft>)
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
                  />
                </label>
              ))}
              <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
                Transaction timestamp
                <input
                  type="datetime-local"
                  value={draft.transaction_timestamp}
                  onChange={(event) =>
                    updateDraft({ transaction_timestamp: event.target.value })
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
                Metadata JSON
                <textarea
                  value={draft.metadata}
                  onChange={(event) =>
                    updateDraft({ metadata: event.target.value })
                  }
                  className="mt-2 min-h-32 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
                  rows={6}
                />
              </label>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void submitAnalyze()}
                disabled={analysisLoading}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {analysisLoading ? "Scoring..." : "Analyze transaction"}
              </button>
              <button
                type="button"
                onClick={() =>
                  loadScenario(
                    defaultDraft,
                    "risk_level should be HIGH or CRITICAL and the response should include explanation and feature importance.",
                  )
                }
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:text-red-700"
              >
                Load high-risk example
              </button>
              <button
                type="button"
                onClick={() =>
                  loadScenario(
                    lowRiskDraft,
                    "risk_level should stay LOW and the score should be below the high-risk threshold.",
                  )
                }
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:text-red-700"
              >
                Load low-risk example
              </button>
            </div>

            <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">Goal state: </span>
              {lastGoal}
            </div>

            {analysisResult ? (
              <div className="mt-6 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Latest result
                    </p>
                    <h4 className="mt-1 text-2xl font-black text-slate-900">
                      {analysisResult.risk_level} ·{" "}
                      {(analysisResult.risk_score * 100).toFixed(1)}%
                    </h4>
                  </div>
                  <div
                    className={`rounded-full px-3 py-1 text-sm font-semibold ${analysisResult.is_fraud ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
                  >
                    {analysisResult.is_fraud
                      ? "Predicted fraud"
                      : "Predicted legitimate"}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Model version
                    </div>
                    <div className="mt-1 text-lg font-bold text-slate-900">
                      {analysisResult.model_version}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Rate limit count
                    </div>
                    <div className="mt-1 text-lg font-bold text-slate-900">
                      {analysisResult.rate_limit_count}
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Explanation
                  </div>
                  <p className="mt-2 leading-7 text-slate-700">
                    {analysisResult.explanation ||
                      "No explanation generated for this result."}
                  </p>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Top contributing features
                  </div>
                  <div className="mt-3 space-y-3">
                    {Object.entries(analysisResult.feature_importance)
                      .sort(
                        (left, right) => Math.abs(right[1]) - Math.abs(left[1]),
                      )
                      .slice(0, 5)
                      .map(([feature, value]) => (
                        <div key={feature}>
                          <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                            <span>{feature}</span>
                            <span>{value.toFixed(3)}</span>
                          </div>
                          <div className="mt-1 h-2 rounded-full bg-slate-200">
                            <div
                              className={`h-2 rounded-full ${value >= 0 ? "bg-red-500" : "bg-emerald-500"}`}
                              style={{
                                width: `${Math.min(100, Math.abs(value) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.08)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-600">
                    Test runner
                  </p>
                  <h3 className="mt-2 text-2xl font-black text-slate-900">
                    Manual system checks
                  </h3>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {scenarioGoals.map((scenario) => (
                  <div
                    key={scenario.title}
                    className={`rounded-[1.5rem] border p-4 ${scenarioCardTone("pending")}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-slate-900">
                          {scenario.title}
                        </h4>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {scenario.goal}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={scenario.action}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:text-red-700"
                      >
                        Load
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void submitAnalyze()}
                  className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  Run current payload
                </button>
                <button
                  type="button"
                  onClick={() => void runDuplicateTest()}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:text-red-700"
                >
                  Run duplicate test
                </button>
                <button
                  type="button"
                  onClick={() => void runBurstTest()}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:text-red-700"
                >
                  Run 11-request burst
                </button>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.08)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-600">
                    Model governance
                  </p>
                  <h3 className="mt-2 text-2xl font-black text-slate-900">
                    Drift and registry status
                  </h3>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Production version
                  </div>
                  <div className="mt-1 text-lg font-bold text-slate-900">
                    {modelStatus?.production_version || "Loading..."}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Latest model
                  </div>
                  <div className="mt-1 text-lg font-bold text-slate-900">
                    {summary?.latest_model_version ||
                      modelStatus?.registered_versions?.[0] ||
                      "Loading..."}
                  </div>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                {driftReport
                  ? `Drift window: ${driftReport.window_hours} hours. ${driftReport.has_drift ? `${driftReport.drifted_feature_count} drifted feature(s), retrain ${driftReport.retrain_recommended ? "recommended" : "not required"}.` : "No drift detected."}`
                  : "Drift report loading..."}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.08)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-600">
                    Execution log
                  </p>
                  <h3 className="mt-2 text-2xl font-black text-slate-900">
                    Goal state check-ins
                  </h3>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {activityLog.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                    No tests run yet. Load a scenario, submit it, or run a burst
                    test.
                  </div>
                ) : (
                  activityLog.map((entry) => (
                    <div
                      key={entry.id}
                      className={`rounded-[1.5rem] border p-4 ${scenarioCardTone(entry.status)}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="font-bold text-slate-900">
                          {entry.title}
                        </h4>
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] opacity-75">
                          {entry.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        <span className="font-semibold text-slate-900">
                          Goal:{" "}
                        </span>
                        {entry.goal}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        <span className="font-semibold text-slate-900">
                          Result:{" "}
                        </span>
                        {entry.detail}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <TransactionFeed
            alerts={combinedAlerts}
            onAlertClick={setSelectedAlert}
            onDismiss={dismissAlert}
          />
        </div>
      </main>

      <AlertDrawer
        alert={selectedAlert}
        reviewerId={currentReviewerId}
        busy={reviewLoading}
        onClose={() => setSelectedAlert(null)}
        onReview={handleReview}
      />
    </div>
  );
}
