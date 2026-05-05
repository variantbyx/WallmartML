from datetime import UTC, datetime

from pydantic import BaseModel, Field


class ModelRegistryStatus(BaseModel):
    production_version: str
    metadata: dict
    registered_versions: list[str] = Field(default_factory=list)
    generated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))