from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path

import joblib

from app.core.config import settings


class ModelRegistryService:
    def __init__(self) -> None:
        self.registry_path = Path(__file__).resolve().parents[2] / "model_registry.json"

    def _read_registry(self) -> dict[str, dict]:
        if not self.registry_path.exists():
            return {}

        return json.loads(self.registry_path.read_text(encoding="utf-8"))

    def _write_registry(self, registry: dict[str, dict]) -> None:
        self.registry_path.write_text(json.dumps(registry, indent=2, sort_keys=True), encoding="utf-8")

    def get_status(self) -> dict:
        registry = self._read_registry()
        production_version = None
        production_metadata = None

        for version, metadata in registry.items():
            if metadata.get("status") == "production":
                production_version = version
                production_metadata = metadata
                break

        if production_version is None:
            production_version = settings.model_version
            production_metadata = {
                "status": "production",
                "model_path": settings.model_path,
                "scaler_path": settings.scaler_path,
                "created_at": datetime.now(UTC).isoformat(),
                "metrics": {},
            }

        return {
            "production_version": production_version,
            "metadata": production_metadata,
            "registered_versions": list(registry.keys()),
        }

    def register_model(self, version: str, model_path: str, scaler_path: str, metrics: dict[str, float]) -> dict:
        registry = self._read_registry()
        registry[version] = {
            "model_path": model_path,
            "scaler_path": scaler_path,
            "metrics": metrics,
            "created_at": datetime.now(UTC).isoformat(),
            "status": "staging",
        }
        self._write_registry(registry)
        return registry[version]

    def promote(self, version: str) -> dict:
        registry = self._read_registry()
        if version not in registry:
            raise KeyError(f"Model version not found: {version}")

        for metadata in registry.values():
            if metadata.get("status") == "production":
                metadata["status"] = "archived"

        registry[version]["status"] = "production"
        self._write_registry(registry)
        return registry[version]

    def load_production_artifacts(self) -> tuple[str, str, dict]:
        status = self.get_status()
        metadata = status["metadata"]
        return (
            metadata.get("model_path", settings.model_path),
            metadata.get("scaler_path", settings.scaler_path),
            metadata.get("metrics", {}),
        )


model_registry_service = ModelRegistryService()