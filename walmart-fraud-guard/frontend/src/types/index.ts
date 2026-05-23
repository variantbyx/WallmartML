export interface TransactionInput {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  merchant_id?: string | null;
  account_age_days: number;
  total_orders: number;
  total_returns: number;
  avg_order_value: number;
  avg_return_value: number;
  transaction_timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface FraudResult {
  transaction_id: string;
  user_id: string;
  risk_score: number;
  is_fraud: boolean;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  model_version: string;
  timestamp: string;
  explanation: string | null;
  feature_importance: Record<string, number>;
  top_contributing_features: string[];
  rate_limit_count: number;
  burst_pattern_detected: boolean;
}

export interface RecentAlert {
  transaction_id: string;
  user_id: string;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  risk_score: number;
  explanation?: string | null;
  is_confirmed_fraud?: boolean | null;
  reviewer_id?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  amount?: number;
  model_version?: string;
}

export interface AnalyticsSummary {
  window_hours: number;
  start_at: string;
  end_at: string;
  total_transactions: number;
  total_alerts: number;
  high_risk_alerts: number;
  critical_alerts: number;
  reviewed_alerts: number;
  confirmed_frauds: number;
  false_positive_count: number;
  false_positive_rate: number;
  fraud_rate: number;
  risk_distribution: Record<string, number>;
  latest_model_version?: string | null;
  generated_at: string;
}

export interface DriftFeatureStat {
  feature: string;
  reference_mean: number;
  current_mean: number;
  reference_std: number;
  z_score: number;
}

export interface DriftReport {
  window_hours: number;
  start_at: string;
  end_at: string;
  sample_size: number;
  drifted_feature_count: number;
  has_drift: boolean;
  severity: "low" | "medium" | "high";
  drifted_features: DriftFeatureStat[];
  retrain_recommended: boolean;
  generated_at: string;
}

export interface ModelStatus {
  production_version: string;
  metadata: Record<string, unknown>;
  registered_versions: string[];
  generated_at: string;
}

export interface AlertReviewRequest {
  is_confirmed_fraud: boolean;
  reviewer_id: string;
}

export interface AlertReviewResponse {
  transaction_id: string;
  user_id: string;
  risk_level: string;
  risk_score: number;
  is_confirmed_fraud: boolean;
  reviewer_id: string;
  reviewed_at: string;
}

export interface User {
  user_id: string;
  role: "analyst" | "admin";
}

export interface WSMessage {
  type: "fraud_alert" | "drift_alert" | "ping" | "pong";
  data?: RecentAlert | DriftReport | Record<string, unknown>;
}
