import axios, { AxiosError } from "axios";
import type {
  AlertReviewRequest,
  AlertReviewResponse,
  AnalyticsSummary,
  DriftReport,
  FraudResult,
  ModelStatus,
  RecentAlert,
  TransactionInput,
} from "../types";

const api = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
});

function authHeaders(token: string | null) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{
      detail?: string | { message?: unknown };
    }>;
    const detail = axiosError.response?.data?.detail;

    if (typeof detail === "string") {
      return detail;
    }

    if (detail && typeof detail === "object") {
      const message = detail.message;
      if (typeof message === "string") {
        return message;
      }
    }

    return axiosError.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

export async function login(username: string, password: string) {
  const response = await api.post("/api/v1/auth/login", { username, password });
  return response.data as { access_token: string; refresh_token: string };
}

export async function analyzeTransaction(
  token: string | null,
  payload: TransactionInput,
) {
  const response = await api.post<FraudResult>(
    "/api/v1/transactions/analyze",
    payload,
    {
      headers: authHeaders(token),
    },
  );
  return response.data;
}

export async function getSummary(token: string | null) {
  const response = await api.get<AnalyticsSummary>(
    "/api/v1/analytics/summary",
    {
      headers: authHeaders(token),
    },
  );
  return response.data;
}

export async function getDriftReport(token: string | null) {
  const response = await api.get<DriftReport>("/api/v1/analytics/drift", {
    headers: authHeaders(token),
  });
  return response.data;
}

export async function getModelStatus(token: string | null) {
  const response = await api.get<ModelStatus>("/api/v1/models/status", {
    headers: authHeaders(token),
  });
  return response.data;
}

export async function getRecentAlerts(token: string | null, limit = 25) {
  const response = await api.get<RecentAlert[]>("/api/v1/alerts/recent", {
    params: { limit },
    headers: authHeaders(token),
  });
  return response.data;
}

export async function reviewAlert(
  token: string | null,
  transactionId: string,
  payload: AlertReviewRequest,
) {
  const response = await api.post<AlertReviewResponse>(
    `/api/v1/analytics/alerts/${transactionId}/review`,
    payload,
    {
      headers: authHeaders(token),
    },
  );
  return response.data;
}
