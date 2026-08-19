/**
 * Flexible Google Sheets CSV parser.
 * Maps unknown header layouts onto Station KPI fields via alias matching.
 */

import {
  COLUMN_ALIASES,
  SHEET_GID,
  SHEET_ID,
  STATION_NAME,
  type MetricKey,
} from "./config";
import {
  DEFAULT_THRESHOLDS,
  type AlertFinding,
  type KpiMetric,
  type KpiSnapshot,
  type MetricTone,
  type StationKpiRow,
} from "./types";

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      current.push(field);
      field = "";
    } else if (char === "\n") {
      current.push(field);
      rows.push(current);
      current = [];
      field = "";
    } else if (char === "\r") {
      // ignore CR (handled with LF)
    } else {
      field += char;
    }
  }

  if (field.length > 0 || current.length > 0) {
    current.push(field);
    rows.push(current);
  }

  return rows.filter((row) => row.some((cell) => cell.trim() !== ""));
}

function findAliasKey(header: string): MetricKey | null {
  const normalized = normalizeHeader(header);
  for (const [key, aliases] of Object.entries(COLUMN_ALIASES) as [
    MetricKey,
    readonly string[],
  ][]) {
    if (aliases.some((alias) => normalized === alias || normalized.includes(alias))) {
      return key;
    }
  }
  return null;
}

function parseNumber(raw: string): number | null {
  if (!raw || raw.trim() === "" || raw.trim() === "-") return null;
  const cleaned = raw.replace(/%/g, "").replace(/,/g, "").trim();
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function isPercentHeader(header: string, raw: string): boolean {
  const h = normalizeHeader(header);
  if (h.includes("%") || h.includes("rate") || h.includes("sla") || h.includes("percent")) {
    return true;
  }
  return raw.includes("%");
}

function toneForPercent(
  key: string,
  percent: number | null,
): MetricTone {
  if (percent === null) return "neutral";
  const thresholds =
    DEFAULT_THRESHOLDS[key as keyof typeof DEFAULT_THRESHOLDS] ?? null;
  if (!thresholds) {
    if (percent >= 95) return "good";
    if (percent >= 90) return "warn";
    return "bad";
  }
  if (percent >= thresholds.warn) return "good";
  if (percent >= thresholds.critical) return "warn";
  return "bad";
}

function labelForKey(key: string, fallback: string): string {
  const labels: Record<string, string> = {
    station: "Station",
    date: "Date",
    volume: "Volume",
    successRate: "Success Rate",
    attemptRate: "Attempt Rate",
    sla: "SLA",
    fulfillment: "Fulfillment",
    pending: "Pending",
    failed: "Failed",
    delivered: "Delivered",
    target: "Target",
    status: "Status",
    remarks: "Remarks",
  };
  return labels[key] ?? fallback;
}

function buildMetrics(
  mapped: Partial<Record<MetricKey, string>>,
  raw: Record<string, string>,
): KpiMetric[] {
  const preferredOrder: MetricKey[] = [
    "volume",
    "delivered",
    "successRate",
    "attemptRate",
    "sla",
    "fulfillment",
    "pending",
    "failed",
    "target",
    "status",
    "remarks",
  ];

  const metrics: KpiMetric[] = [];
  const used = new Set<string>();

  for (const key of preferredOrder) {
    const valueRaw = mapped[key];
    if (valueRaw === undefined) continue;
    used.add(key);
    const numeric = parseNumber(valueRaw);
    const percentLike =
      key === "successRate" ||
      key === "attemptRate" ||
      key === "sla" ||
      key === "fulfillment" ||
      isPercentHeader(key, valueRaw);

    const percent =
      percentLike && numeric !== null
        ? numeric > 1 && numeric <= 100
          ? numeric
          : numeric <= 1
            ? numeric * 100
            : numeric
        : null;

    metrics.push({
      key,
      label: labelForKey(key, key),
      value: percentLike && percent !== null ? percent : numeric ?? valueRaw,
      raw: valueRaw,
      percent,
      tone: percentLike ? toneForPercent(key, percent) : "neutral",
      unit: percentLike ? "percent" : numeric !== null ? "count" : "text",
    });
  }

  // Preserve unrecognized numeric columns so the dashboard still surfaces sheet KPIs.
  for (const [header, value] of Object.entries(raw)) {
    const alias = findAliasKey(header);
    if (alias && used.has(alias)) continue;
    if (alias === "station" || alias === "date") continue;
    const numeric = parseNumber(value);
    const percentLike = isPercentHeader(header, value);
    const percent =
      percentLike && numeric !== null
        ? numeric <= 1
          ? numeric * 100
          : numeric
        : null;
    const key = alias ?? normalizeHeader(header).replace(/\s+/g, "_");
    if (metrics.some((m) => m.key === key)) continue;
    metrics.push({
      key,
      label: header.trim() || key,
      value: percentLike && percent !== null ? percent : numeric ?? value,
      raw: value,
      percent,
      tone: percentLike ? toneForPercent(key, percent) : "neutral",
      unit: percentLike ? "percent" : numeric !== null ? "count" : "text",
    });
  }

  return metrics;
}

function rowFromCells(
  headers: string[],
  cells: string[],
): StationKpiRow | null {
  const raw: Record<string, string> = {};
  const mapped: Partial<Record<MetricKey, string>> = {};

  headers.forEach((header, index) => {
    const value = (cells[index] ?? "").trim();
    raw[header] = value;
    const alias = findAliasKey(header);
    if (alias && mapped[alias] === undefined) {
      mapped[alias] = value;
    }
  });

  const station = (mapped.station ?? "").trim();
  if (!station) return null;

  return {
    station,
    date: mapped.date?.trim() || null,
    metrics: buildMetrics(mapped, raw),
    raw,
  };
}

function evaluateAlerts(row: StationKpiRow | null): AlertFinding[] {
  if (!row) {
    return [
      {
        severity: "critical",
        title: "No station data",
        detail: `No KPI rows found for station ${STATION_NAME}.`,
      },
    ];
  }

  const findings: AlertFinding[] = [];
  for (const metric of row.metrics) {
    if (metric.percent === null) continue;
    if (metric.tone === "bad") {
      findings.push({
        severity: "critical",
        title: `${metric.label} below critical threshold`,
        detail: `${metric.label} is ${metric.percent.toFixed(1)}% for ${row.station}${row.date ? ` on ${row.date}` : ""}.`,
        metricKey: metric.key,
      });
    } else if (metric.tone === "warn") {
      findings.push({
        severity: "warning",
        title: `${metric.label} needs attention`,
        detail: `${metric.label} is ${metric.percent.toFixed(1)}% — below warn threshold.`,
        metricKey: metric.key,
      });
    }
  }

  if (findings.length === 0) {
    findings.push({
      severity: "info",
      title: "KPIs within target",
      detail: `Station ${row.station} is meeting configured thresholds.`,
    });
  }

  return findings;
}

function demoSnapshot(): KpiSnapshot {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  const makeRow = (
    date: string,
    values: Record<string, string>,
  ): StationKpiRow => {
    const headers = Object.keys(values);
    const cells = Object.values(values);
    return rowFromCells(headers, cells)!;
  };

  const latest = makeRow(today, {
    Station: STATION_NAME,
    Date: today,
    Volume: "1284",
    Delivered: "1196",
    "Success Rate": "93.1%",
    "Attempt Rate": "97.4%",
    SLA: "94.8%",
    Fulfillment: "92.6%",
    Pending: "48",
    Failed: "40",
    Status: "Watch",
    Remarks: "Demo data — connect the live Google Sheet to replace.",
  });

  const history = [
    latest,
    makeRow(yesterday, {
      Station: STATION_NAME,
      Date: yesterday,
      Volume: "1310",
      Delivered: "1238",
      "Success Rate": "94.5%",
      "Attempt Rate": "98.1%",
      SLA: "95.6%",
      Fulfillment: "93.8%",
      Pending: "36",
      Failed: "36",
      Status: "On Track",
      Remarks: "Demo history row",
    }),
  ];

  return {
    station: STATION_NAME,
    fetchedAt: new Date().toISOString(),
    source: "demo",
    sourceLabel: "Demo sample (sheet not publicly readable yet)",
    rowCount: history.length,
    latest,
    history,
    alerts: evaluateAlerts(latest),
    sheetAccessible: false,
    error:
      "Google Sheet requires login. Share as 'Anyone with the link' (Viewer) or Publish to web so live KPIs can sync.",
  };
}

export async function fetchSheetCsv(): Promise<string> {
  const urls = [
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`,
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${SHEET_GID}`,
  ];

  let lastError = "Unable to fetch sheet";
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        redirect: "follow",
        headers: { Accept: "text/csv,text/plain,*/*" },
        next: { revalidate: 60 },
      });
      const text = await response.text();
      if (
        !response.ok ||
        text.includes("accounts.google.com") ||
        text.includes("<!DOCTYPE html>") ||
        text.includes("Sign in")
      ) {
        lastError = `Sheet not publicly readable (HTTP ${response.status}).`;
        continue;
      }
      return text;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }
  throw new Error(lastError);
}

export function parseStationKpis(
  csv: string,
  stationName = STATION_NAME,
): StationKpiRow[] {
  const table = parseCsv(csv);
  if (table.length < 2) return [];

  const headers = table[0].map((h) => h.trim());
  const rows: StationKpiRow[] = [];

  for (const cells of table.slice(1)) {
    const row = rowFromCells(headers, cells);
    if (!row) continue;
    if (row.station.toLowerCase() !== stationName.toLowerCase()) continue;
    rows.push(row);
  }

  // Prefer newest dates first when a date column exists.
  rows.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.localeCompare(a.date);
  });

  return rows;
}

export async function getKpiSnapshot(): Promise<KpiSnapshot> {
  try {
    const csv = await fetchSheetCsv();
    const history = parseStationKpis(csv, STATION_NAME);
    const latest = history[0] ?? null;

    return {
      station: STATION_NAME,
      fetchedAt: new Date().toISOString(),
      source: "google-sheets",
      sourceLabel: `Google Sheet ${SHEET_ID} (gid=${SHEET_GID})`,
      rowCount: history.length,
      latest,
      history: history.slice(0, 14),
      alerts: evaluateAlerts(latest),
      sheetAccessible: true,
    };
  } catch (error) {
    const demo = demoSnapshot();
    return {
      ...demo,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function formatMetricValue(metric: KpiMetric): string {
  if (metric.value === null || metric.value === "") return "—";
  if (metric.unit === "percent" && typeof metric.value === "number") {
    return `${metric.value.toFixed(1)}%`;
  }
  if (typeof metric.value === "number") {
    return metric.value.toLocaleString();
  }
  return String(metric.value);
}
