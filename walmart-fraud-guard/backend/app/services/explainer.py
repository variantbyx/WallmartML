from __future__ import annotations

from functools import lru_cache
from typing import Any

import numpy as np

try:
    import shap
except Exception:  # pragma: no cover - optional dependency fallback
    shap = None

try:
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_openai import ChatOpenAI
except Exception:  # pragma: no cover - optional dependency fallback
    ChatPromptTemplate = None
    ChatOpenAI = None

from app.core.config import settings
from app.models.alert import FraudResult
from app.models.transaction import TransactionInput
from app.services.fraud_detector import FraudDetector


class ExplainerService:
    def __init__(self) -> None:
        self.feature_names = [
            "amount",
            "account_age_days",
            "total_orders",
            "total_returns",
            "avg_order_value",
            "avg_return_value",
            "return_ratio",
            "arv_aov_ratio",
            "hour",
            "is_night",
        ]

    async def explain(self, transaction: TransactionInput, result: FraudResult, detector: FraudDetector) -> str:
        feature_impacts = self._compute_feature_impacts(transaction, detector)
        result.feature_importance = feature_impacts
        result.top_contributing_features = [
            name for name, value in sorted(feature_impacts.items(), key=lambda item: abs(item[1]), reverse=True)[:3]
            if value != 0
        ]

        explanation = await self._generate_llm_explanation(transaction, result, feature_impacts)
        if explanation:
            return explanation

        return self._fallback_explanation(transaction, result, feature_impacts)

    def _compute_feature_impacts(self, transaction: TransactionInput, detector: FraudDetector) -> dict[str, float]:
        if shap is None:
            return {}

        features = np.asarray([detector.extract_features(transaction)], dtype=float)
        scaled_features = detector.scaler.transform(features)

        explainer = self._get_explainer(detector)
        shap_values = explainer.shap_values(scaled_features)

        if isinstance(shap_values, list):
            class_values = shap_values[1] if len(shap_values) > 1 else shap_values[0]
        else:
            class_values = shap_values

        impacts = class_values[0] if getattr(class_values, "ndim", 1) > 1 else class_values
        return {name: float(value) for name, value in zip(self.feature_names, impacts)}

    @lru_cache(maxsize=1)
    def _get_explainer(self, detector: FraudDetector):
        return shap.TreeExplainer(detector.model)

    async def _generate_llm_explanation(
        self,
        transaction: TransactionInput,
        result: FraudResult,
        feature_impacts: dict[str, float],
    ) -> str | None:
        if ChatPromptTemplate is None or ChatOpenAI is None or not settings.openai_api_key:
            return None

        prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "You are a fraud analyst assistant for a retail risk operations team. "
                    "Explain alerts clearly, briefly, and without technical jargon. "
                    "Do not mention that you are an AI model. Do not invent missing facts.",
                ),
                (
                    "human",
                    "Transaction id: {transaction_id}\n"
                    "Risk level: {risk_level}\n"
                    "Risk score: {risk_score}\n"
                    "User id: {user_id}\n"
                    "Amount: {amount}\n"
                    "Account age days: {account_age_days}\n"
                    "Total orders: {total_orders}\n"
                    "Total returns: {total_returns}\n"
                    "Average order value: {avg_order_value}\n"
                    "Average return value: {avg_return_value}\n"
                    "Top feature impacts: {feature_impacts}\n"
                    "Top contributing features: {top_features}\n\n"
                    "Write 2-3 sentences for a fraud analyst. Start with the strongest signal. "
                    "Mention the likely pattern and why it is suspicious.",
                ),
            ]
        )
        llm = ChatOpenAI(
            model=settings.llm_model_name,
            temperature=settings.llm_temperature,
            max_tokens=settings.llm_max_tokens,
            api_key=settings.openai_api_key,
        )
        chain = prompt | llm
        response = await chain.ainvoke(
            {
                "transaction_id": transaction.id,
                "risk_level": result.risk_level,
                "risk_score": f"{result.risk_score:.4f}",
                "user_id": transaction.user_id,
                "amount": f"{transaction.amount:.2f}",
                "account_age_days": transaction.account_age_days,
                "total_orders": transaction.total_orders,
                "total_returns": transaction.total_returns,
                "avg_order_value": f"{transaction.avg_order_value:.2f}",
                "avg_return_value": f"{transaction.avg_return_value:.2f}",
                "feature_impacts": self._format_feature_impacts(feature_impacts),
                "top_features": ", ".join(result.top_contributing_features) or "none",
            }
        )

        content = getattr(response, "content", None)
        return content.strip() if isinstance(content, str) and content.strip() else None

    def _fallback_explanation(
        self,
        transaction: TransactionInput,
        result: FraudResult,
        feature_impacts: dict[str, float],
    ) -> str:
        if feature_impacts:
            ranked = sorted(feature_impacts.items(), key=lambda item: abs(item[1]), reverse=True)
            top_signals = []
            for name, value in ranked[:3]:
                direction = "increased" if value > 0 else "decreased"
                top_signals.append(f"{name} {direction} risk ({value:+.3f})")

            joined = "; ".join(top_signals)
            return (
                f"Transaction {transaction.id} was flagged as {result.risk_level} risk "
                f"with score {result.risk_score:.4f} because {joined}."
            )

        reasons: list[str] = []

        if transaction.total_orders > 0:
            return_ratio = transaction.total_returns / transaction.total_orders
            if return_ratio > 0.5:
                reasons.append("return ratio is unusually high")

        if transaction.avg_order_value > 0 and transaction.avg_return_value > 1.3 * transaction.avg_order_value:
            reasons.append("average return value is significantly higher than average order value")

        if transaction.account_age_days < 30:
            reasons.append("account is relatively new")

        if transaction.amount > 1500:
            reasons.append("transaction amount is high for standard retail behavior")

        if not reasons:
            reasons.append("model detected a non-obvious risk pattern in feature combinations")

        joined_reasons = "; ".join(reasons)
        return (
            f"Transaction {transaction.id} was flagged as {result.risk_level} risk "
            f"with score {result.risk_score:.4f} because {joined_reasons}."
        )

    def _format_feature_impacts(self, feature_impacts: dict[str, float]) -> str:
        if not feature_impacts:
            return "none"

        ranked = sorted(feature_impacts.items(), key=lambda item: abs(item[1]), reverse=True)
        return "; ".join(f"{name}={value:+.3f}" for name, value in ranked[:5])


explainer_service = ExplainerService()
