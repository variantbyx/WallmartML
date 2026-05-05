const API_BASE = "http://localhost:8000/api/v1";

const summaryGrid = document.getElementById("summaryGrid");
const alertRows = document.getElementById("alertRows");
const driftList = document.getElementById("driftList");
const riskDistribution = document.getElementById("riskDistribution");
const apiStatus = document.getElementById("apiStatus");
const driftSeverity = document.getElementById("driftSeverity");
const driftCount = document.getElementById("driftCount");
const retrainStatus = document.getElementById("retrainStatus");
const modelVersion = document.getElementById("modelVersion");
const modelMetric = document.getElementById("modelMetric");

function formatNumber(value) {
  return Number(value ?? 0).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

function riskClass(level) {
  return String(level || "low").toLowerCase();
}

function makeStatCard(title, value, note = "") {
  const card = document.createElement("article");
  card.className = "stat-card";
  card.innerHTML = `
    <p class="metric-title">${title}</p>
    <strong>${value}</strong>
    ${note ? `<p class="muted">${note}</p>` : ""}
  `;
  return card;
}

async function loadSummary() {
  const response = await fetch(`${API_BASE}/analytics/summary?window_hours=24`);
  if (!response.ok) throw new Error("Summary request failed");
  const data = await response.json();

  summaryGrid.innerHTML = "";
  summaryGrid.append(
    makeStatCard(
      "Transactions",
      formatNumber(data.total_transactions),
      `Window: ${data.window_hours}h`,
    ),
    makeStatCard(
      "Alerts",
      formatNumber(data.total_alerts),
      `${formatNumber(data.high_risk_alerts)} high risk`,
    ),
    makeStatCard(
      "Confirmed Fraud",
      formatNumber(data.confirmed_frauds),
      `Rate: ${Math.round((data.fraud_rate || 0) * 100)}%`,
    ),
    makeStatCard(
      "False Positives",
      formatNumber(data.false_positive_count),
      `Rate: ${Math.round((data.false_positive_rate || 0) * 100)}%`,
    ),
  );

  driftCount.textContent = data.risk_distribution
    ? formatNumber(data.risk_distribution.HIGH || 0)
    : "0";
  modelVersion.textContent = data.latest_model_version || "unavailable";
  modelMetric.textContent = `Reviewed alerts: ${formatNumber(data.reviewed_alerts)} | Critical alerts: ${formatNumber(data.critical_alerts)}`;
  renderRiskDistribution(data.risk_distribution || {});
}

async function loadDrift() {
  const response = await fetch(`${API_BASE}/analytics/drift?window_hours=24`);
  if (!response.ok) throw new Error("Drift request failed");
  const data = await response.json();

  driftSeverity.textContent = data.severity || "LOW";
  retrainStatus.textContent = data.retrain_recommended ? "Yes" : "No";
  driftCount.textContent = formatNumber(data.drifted_feature_count);

  if (!data.drifted_features.length) {
    driftList.innerHTML = `<div class="drift-item"><strong>No significant drift detected</strong><span class="muted">Incoming transaction distribution is within the reference range.</span></div>`;
    return;
  }

  driftList.innerHTML = data.drifted_features
    .map(
      (item) => `
        <div class="drift-item">
          <strong>${item.feature}</strong>
          <div class="muted">Reference mean ${item.reference_mean} vs current mean ${item.current_mean}</div>
          <div class="muted">z-score ${item.z_score}</div>
        </div>
      `,
    )
    .join("");
}

async function loadAlerts() {
  const response = await fetch(`${API_BASE}/alerts/recent?limit=8`);
  if (!response.ok) throw new Error("Alerts request failed");
  const alerts = await response.json();

  alertRows.innerHTML = alerts
    .map(
      (alert) => `
        <tr>
          <td>${alert.transaction_id}</td>
          <td>${alert.user_id}</td>
          <td><span class="risk ${riskClass(alert.risk_level)}">${alert.risk_level}</span></td>
          <td>${formatNumber(alert.risk_score)}</td>
          <td class="table-expl">${alert.explanation || "No explanation stored"}</td>
        </tr>
      `,
    )
    .join("");
}

async function loadModelStatus() {
  const response = await fetch(`${API_BASE}/models/status`);
  if (!response.ok) throw new Error("Model status request failed");
  const data = await response.json();
  apiStatus.textContent = "Connected";
  modelVersion.textContent = data.production_version;
  const metricText = data.metadata?.metrics?.roc_auc
    ? `ROC-AUC ${data.metadata.metrics.roc_auc.toFixed(4)}`
    : "No promotion metrics available";
  modelMetric.textContent = metricText;
}

function renderRiskDistribution(distribution) {
  const entries = Object.entries(distribution);
  if (!entries.length) {
    riskDistribution.innerHTML = `<div class="muted">No distribution data yet.</div>`;
    return;
  }

  const max = Math.max(...entries.map(([, value]) => Number(value) || 0), 1);
  riskDistribution.innerHTML = entries
    .sort((a, b) => b[1] - a[1])
    .map(
      ([name, value]) => `
        <div class="bar-row">
          <span>${name}</span>
          <div class="bar-track"><div class="bar-fill" style="width: ${(Number(value) / max) * 100}%"></div></div>
          <span>${formatNumber(value)}</span>
        </div>
      `,
    )
    .join("");
}

async function refreshAll() {
  try {
    apiStatus.textContent = "Connecting...";
    await Promise.all([
      loadModelStatus(),
      loadSummary(),
      loadDrift(),
      loadAlerts(),
    ]);
  } catch (error) {
    apiStatus.textContent = "Offline";
    console.error(error);
  }
}

refreshAll();
setInterval(refreshAll, 15000);
