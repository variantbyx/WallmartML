from app.services.model_registry import ModelRegistryService


def test_registry_promote_updates_production(tmp_path):
    service = ModelRegistryService()
    service.registry_path = tmp_path / "model_registry.json"

    service.register_model("v1", "model.pkl", "scaler.pkl", {"roc_auc": 0.7})
    service.promote("v1")

    status = service.get_status()
    assert status["production_version"] == "v1"
    assert "v1" in status["registered_versions"]