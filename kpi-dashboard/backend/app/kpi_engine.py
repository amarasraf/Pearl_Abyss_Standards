import logging
import re
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

from app.config import Settings
from app.models import DashboardResponse, KpiMetric, KpiSummary
from app.sheets_client import SheetsClient, get_mock_rows

logger = logging.getLogger(__name__)

STATION_KEYS = ("station", "station name", "station_name", "hub", "hub name", "route")
DATE_KEYS = ("date", "day", "report date", "report_date")


def _normalize_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.strip().lower()).strip()


def _find_column(row: dict[str, Any], candidates: tuple[str, ...]) -> str | None:
    normalized = {_normalize_key(key): key for key in row}
    for candidate in candidates:
        if candidate in normalized:
            return normalized[candidate]
    for key in row:
        normalized_key = _normalize_key(key)
        if any(candidate in normalized_key for candidate in candidates):
            return key
    return None


def _to_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return float(value)
    cleaned = str(value).replace(",", "").replace("%", "").strip()
    try:
        return float(cleaned)
    except ValueError:
        return None


def _metric_status(value: float, target: float | None, higher_is_better: bool = True) -> str:
    if target is None:
        return "neutral"
    if higher_is_better:
        if value >= target:
            return "good"
        if value >= target * 0.95:
            return "warning"
        return "critical"
    if value <= target:
        return "good"
    if value <= target * 1.05:
        return "warning"
    return "critical"


def _filter_station_rows(rows: list[dict[str, Any]], station: str) -> list[dict[str, Any]]:
    if not rows:
        return []

    station_col = _find_column(rows[0], STATION_KEYS)
    if station_col is None:
        logger.warning("Station column not found; returning all rows")
        return rows

    station_upper = station.upper()
    filtered = [
        row
        for row in rows
        if station_upper in str(row.get(station_col, "")).upper()
    ]
    return filtered or rows


def _sort_by_date(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not rows:
        return rows

    date_col = _find_column(rows[0], DATE_KEYS)
    if date_col is None:
        return rows

    def parse_date(row: dict[str, Any]) -> datetime:
        raw = str(row.get(date_col, ""))
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y"):
            try:
                return datetime.strptime(raw, fmt)
            except ValueError:
                continue
        return datetime.min

    return sorted(rows, key=parse_date, reverse=True)


def _build_metrics(row: dict[str, Any]) -> list[KpiMetric]:
    metrics: list[KpiMetric] = []
    skip_keys = set(STATION_KEYS + DATE_KEYS)

    sla_target = None
    for key, value in row.items():
        if "sla" in _normalize_key(key) and "target" in _normalize_key(key):
            sla_target = _to_float(value)
            break

    for key, value in row.items():
        normalized = _normalize_key(key)
        if normalized in skip_keys or value in ("", None):
            continue

        numeric = _to_float(value)
        if numeric is None:
            metrics.append(KpiMetric(name=key, value=str(value)))
            continue

        target = sla_target if "%" in str(key).lower() or "rate" in normalized else None
        higher_is_better = "failed" not in normalized and "pending" not in normalized
        metrics.append(
            KpiMetric(
                name=key,
                value=numeric,
                unit="%" if "%" in str(key) or "rate" in normalized else "",
                target=target,
                status=_metric_status(numeric, target, higher_is_better=higher_is_better),
            )
        )

    return metrics


def _build_alerts(metrics: list[KpiMetric]) -> list[str]:
    alerts: list[str] = []
    for metric in metrics:
        if metric.status == "critical":
            alerts.append(f"{metric.name} is below target ({metric.value}{metric.unit})")
        elif metric.status == "warning":
            alerts.append(f"{metric.name} is near threshold ({metric.value}{metric.unit})")
    return alerts


def _overall_score(metrics: list[KpiMetric]) -> float | None:
    scored = [metric for metric in metrics if isinstance(metric.value, (int, float)) and "%" in metric.unit]
    if not scored:
        return None
    return round(sum(float(metric.value) for metric in scored) / len(scored), 1)


class KpiEngine:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.sheets = SheetsClient(settings)

    def load_rows(self) -> list[dict[str, Any]]:
        if self.settings.use_mock_data or not self.settings.google_service_account_json:
            logger.info("Using mock KPI data for station %s", self.settings.station_name)
            return get_mock_rows(self.settings.station_name)

        try:
            return self.sheets.fetch_rows()
        except Exception as exc:
            logger.exception("Failed to fetch Google Sheet, falling back to mock data: %s", exc)
            return get_mock_rows(self.settings.station_name)

    def build_dashboard(self, station: str | None = None) -> DashboardResponse:
        station_name = station or self.settings.station_name
        rows = _filter_station_rows(self.load_rows(), station_name)
        rows = _sort_by_date(rows)

        if not rows:
            empty_summary = KpiSummary(station=station_name, date="", metrics=[], overall_score=None, alerts=[])
            return DashboardResponse(
                station=station_name,
                last_updated=datetime.now(ZoneInfo(self.settings.timezone)).isoformat(),
                summary=empty_summary,
                history=[],
                raw_row_count=0,
            )

        latest = rows[0]
        date_col = _find_column(latest, DATE_KEYS)
        report_date = str(latest.get(date_col, "")) if date_col else ""

        metrics = _build_metrics(latest)
        alerts = _build_alerts(metrics)
        summary = KpiSummary(
            station=station_name,
            date=report_date,
            metrics=metrics,
            overall_score=_overall_score(metrics),
            alerts=alerts,
        )

        history: list[dict[str, str | float]] = []
        for row in rows[:14]:
            entry: dict[str, str | float] = {}
            for key, value in row.items():
                numeric = _to_float(value)
                entry[key] = numeric if numeric is not None else str(value)
            history.append(entry)

        return DashboardResponse(
            station=station_name,
            last_updated=datetime.now(ZoneInfo(self.settings.timezone)).isoformat(),
            summary=summary,
            history=history,
            raw_row_count=len(rows),
        )
