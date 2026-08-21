import { parse } from "csv-parse/sync";

export const STATION_CODE = process.env.STATION_CODE ?? "C4-NIL-5-85";
export const APP_TIME_ZONE = process.env.APP_TIME_ZONE ?? "Asia/Kuala_Lumpur";
export const SHEET_CSV_URL =
  process.env.GOOGLE_SHEET_CSV_URL ??
  "https://docs.google.com/spreadsheets/d/1-crbMCbGgsHydSUQzhVpWHwS7wRniHt8TN9z-7XQ8Pk/gviz/tq?tqx=out:csv&gid=0";

export type KpiMetric = {
  name: string;
  targetPercent: number;
  currentPercent: number | null;
  leftToTarget: number;
  total: number;
};

export type KpiSnapshot = {
  stationCode: string;
  stationName: string;
  zone: string;
  sourceUpdatedAt: string;
  capturedAt: string;
  recordedDate: string;
  metrics: KpiMetric[];
};

const numberOrZero = (value: string | undefined) =>
  Number.parseInt((value ?? "").replaceAll(",", ""), 10) || 0;

const percentOrNull = (value: string | undefined) => {
  const normalized = (value ?? "").trim().replace("%", "");
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

export function malaysiaDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export async function fetchLiveKpi(): Promise<KpiSnapshot> {
  const response = await fetch(`${SHEET_CSV_URL}&cacheBust=${Date.now()}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`KPI sheet returned HTTP ${response.status}`);
  }

  const records = parse(await response.text(), {
    bom: true,
    relax_column_count: true,
    skip_empty_lines: true,
  }) as string[][];
  if (records.length < 2) throw new Error("The KPI sheet is empty");

  const station = records.slice(1).find((row) => row[1]?.trim() === STATION_CODE);
  if (!station) throw new Error(`Station ${STATION_CODE} was not found`);

  const metric = (
    name: string,
    targetPercent: number,
    totalColumn: number,
    currentColumn: number,
    gapColumn: number,
  ): KpiMetric => ({
    name,
    targetPercent,
    currentPercent: percentOrNull(station[currentColumn]),
    leftToTarget: numberOrZero(station[gapColumn]),
    total: numberOrZero(station[totalColumn]),
  });
  const now = new Date();

  return {
    stationCode: STATION_CODE,
    stationName: station[3]?.trim() || "Nilai",
    zone: station[0]?.trim() || "South 4",
    sourceUpdatedAt: records[0]?.[1]?.split(" GROUP")[0]?.trim() || "",
    capturedAt: now.toISOString(),
    recordedDate: malaysiaDate(now),
    metrics: [
      metric("FIFO D0", 95, 4, 5, 6),
      metric("PRIOR D0", 92, 9, 10, 11),
      metric("D0 Completion", 88, 14, 15, 16),
    ],
  };
}

export function retentionCutoff(date = new Date()) {
  const current = malaysiaDate(date);
  const [year, month, day] = current.split("-").map(Number);
  const cutoff = new Date(Date.UTC(year - 2, month - 1, day));
  return cutoff.toISOString().slice(0, 10);
}
