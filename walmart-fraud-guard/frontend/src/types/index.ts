export interface FraudAlert {
  transaction_id: string;
  account_id: string;
  amount: number;
  risk_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  explanation: {
    features: Record<
      string,
      { impact: string; value: number; contribution: string }
    >;
    summary: string;
    risk_factors: string[];
  };
  timestamp: string;
  analyst_review?: {
    flag: boolean;
    notes: string;
    resolution?: "confirmed_fraud" | "false_positive" | "pending";
  };
}

export interface Analytics {
  total_transactions: number;
  fraud_count: number;
  fraud_rate: number;
  high_alerts: number;
  critical_alerts: number;
  avg_score: number;
  timestamp: string;
}

export interface DriftAlert {
  type: "drift_alert";
  severity: "low" | "medium" | "high";
  drifted_features: string[];
  message: string;
}

export interface WSMessage {
  type: "fraud_alert" | "drift_alert" | "ping";
  data?: FraudAlert | DriftAlert;
}

export interface User {
  user_id: string;
  role: "analyst" | "admin";
}
