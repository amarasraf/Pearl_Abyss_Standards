export interface KpiMetric {
  name: string;
  value: number | string;
  unit: string;
  target: number | null;
  status: "good" | "warning" | "critical" | "neutral";
}

export interface KpiSummary {
  station: string;
  date: string;
  metrics: KpiMetric[];
  overall_score: number | null;
  alerts: string[];
}

export interface DashboardData {
  station: string;
  last_updated: string;
  summary: KpiSummary;
  history: Record<string, string | number>[];
  raw_row_count: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export async function fetchDashboard(station?: string): Promise<DashboardData> {
  const params = station ? `?station=${encodeURIComponent(station)}` : "";
  const res = await fetch(`${API_BASE}/api/dashboard${params}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`Failed to fetch dashboard: ${res.status}`);
  return res.json();
}

export async function fetchSchedule(): Promise<{
  station: string;
  timezone: string;
  schedule: string;
  next_run: string | null;
}> {
  const res = await fetch(`${API_BASE}/api/schedule`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`Failed to fetch schedule: ${res.status}`);
  return res.json();
}
