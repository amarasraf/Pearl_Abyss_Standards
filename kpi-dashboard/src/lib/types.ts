/**
 * Shared KPI types for station performance dashboards.
 */

export type MetricTone = "good" | "warn" | "bad" | "neutral";

export interface KpiMetric {
  key: string;
  label: string;
  value: number | string | null;
  raw: string;
  /** Normalized 0–100 when the source is a percentage. */
  percent: number | null;
  tone: MetricTone;
  unit?: "percent" | "count" | "text";
}

export interface StationKpiRow {
  station: string;
  date: string | null;
  metrics: KpiMetric[];
  raw: Record<string, string>;
}

export interface KpiSnapshot {
  station: string;
  fetchedAt: string;
  source: "google-sheets" | "demo";
  sourceLabel: string;
  rowCount: number;
  latest: StationKpiRow | null;
  history: StationKpiRow[];
  alerts: AlertFinding[];
  sheetAccessible: boolean;
  error?: string;
}

export interface AlertFinding {
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  metricKey?: string;
}

/** Default operational thresholds — override via env when sheet targets differ. */
export const DEFAULT_THRESHOLDS = {
  successRate: { warn: 90, critical: 85 },
  attemptRate: { warn: 95, critical: 90 },
  sla: { warn: 95, critical: 90 },
  fulfillment: { warn: 92, critical: 88 },
} as const;
