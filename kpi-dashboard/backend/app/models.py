from pydantic import BaseModel, Field


class KpiMetric(BaseModel):
    name: str
    value: float | str
    unit: str = ""
    target: float | None = None
    status: str = "neutral"


class KpiSummary(BaseModel):
    station: str
    date: str
    metrics: list[KpiMetric] = Field(default_factory=list)
    overall_score: float | None = None
    alerts: list[str] = Field(default_factory=list)


class DashboardResponse(BaseModel):
    station: str
    last_updated: str
    summary: KpiSummary
    history: list[dict[str, str | float]] = Field(default_factory=list)
    raw_row_count: int = 0
