import { useCallback, useEffect, useState } from "react";
import {
  getApiErrorMessage,
  getDriftReport,
  getModelStatus,
  getSummary,
} from "../lib/api";
import type { AnalyticsSummary, DriftReport, ModelStatus } from "../types";

export function useAnalytics() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [driftReport, setDriftReport] = useState<DriftReport | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const token = localStorage.getItem("access_token");
      const [summaryResponse, driftResponse, modelResponse] = await Promise.all(
        [getSummary(token), getDriftReport(token), getModelStatus(token)],
      );

      setSummary(summaryResponse);
      setDriftReport(driftResponse);
      setModelStatus(modelResponse);
      setError(null);
    } catch (fetchError) {
      setError(getApiErrorMessage(fetchError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => {
      void getSummary(localStorage.getItem("access_token"))
        .then((response) => {
          setSummary(response);
          setError(null);
        })
        .catch((fetchError) => setError(getApiErrorMessage(fetchError)));
    }, 15000);

    return () => window.clearInterval(interval);
  }, [refresh]);

  return { summary, driftReport, modelStatus, loading, error, refresh };
}
