from datetime import datetime

from pydantic import BaseModel, Field


class RuleSectionFields(BaseModel):
    title: str = Field(min_length=1, max_length=60)
    rules: list[str] = []
    enabled: bool = True
    order: int = 0


class RuleSectionCreate(RuleSectionFields):
    id: str = Field(min_length=2, max_length=30, pattern=r"^[a-z0-9-]+$")


class RuleSection(RuleSectionFields):
    id: str
    updated_at: datetime | None = None


def rule_section(doc: dict) -> RuleSection:
    return RuleSection(id=doc["_id"], **{k: v for k, v in doc.items() if k != "_id"})
