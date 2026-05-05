import React, { useState } from "react";
import { MetricCards } from "./components/MetricCards";
import { TransactionFeed } from "./components/TransactionFeed";
import { AlertDrawer } from "./components/AlertDrawer";
import { DriftBanner } from "./components/DriftBanner";
import { useTransactionStream } from "./hooks/useTransactionStream";
import { useAnalytics } from "./hooks/useAnalytics";
import { useAuthStore } from "./store/authStore";
import { FraudAlert } from "./types";
import axios from "axios";

export function App() {
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);
  const { alerts, driftAlert, connected, dismissAlert } =
    useTransactionStream();
  const { analytics, loading } = useAnalytics();
  const { user, isAuthenticated } = useAuthStore();

  const handleReview = async (
    alert: FraudAlert,
    flag: boolean,
    notes: string,
  ) => {
    try {
      await axios.put(
        `/api/v1/alerts/${alert.transaction_id}/review`,
        {
          flag,
          notes,
          resolution: flag ? "confirmed_fraud" : "false_positive",
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        },
      );
      dismissAlert(alert.transaction_id);
      setSelectedAlert(null);
      alert("Review submitted successfully!");
    } catch (error) {
      console.error("Failed to submit review:", error);
      alert("Failed to submit review");
    }
  };

  if (!isAuthenticated()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">
            Walmart Fraud Guard
          </h1>
          <p className="text-gray-600 mb-8">
            Production fraud detection platform
          </p>
          <p className="text-sm text-gray-500">Please log in to continue.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Walmart Fraud Guard</h1>
            <p className="text-red-100 text-sm">
              Real-time Transaction Monitoring
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`h-3 w-3 rounded-full ${connected ? "bg-green-400" : "bg-red-400"}`}
              />
              <span className="text-sm">
                {connected ? "Connected" : "Disconnected"}
              </span>
            </div>
            <div className="text-sm">
              {user && (
                <span>{user.role === "admin" ? "👤 Admin" : "👤 Analyst"}</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Drift Alert Banner */}
        <DriftBanner alert={driftAlert} />

        {/* Metrics */}
        <MetricCards analytics={analytics} loading={loading} />

        {/* Alert Feed */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <TransactionFeed
            alerts={alerts}
            onAlertClick={setSelectedAlert}
            onDismiss={dismissAlert}
          />
        </div>
      </main>

      {/* Alert Drawer */}
      <AlertDrawer
        alert={selectedAlert}
        onClose={() => setSelectedAlert(null)}
        onReview={handleReview}
      />
    </div>
  );
}
