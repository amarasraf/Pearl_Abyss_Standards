import { parse } from "csv-parse/sync";
import { STATION_CODE } from "@/lib/kpi";

export const RAW_DATA_CSV_URL =
  process.env.GOOGLE_RAW_CSV_URL ??
  "https://docs.google.com/spreadsheets/d/1-crbMCbGgsHydSUQzhVpWHwS7wRniHt8TN9z-7XQ8Pk/gviz/tq?tqx=out:csv&gid=1615722066";

export type StatusCount = {
  status: string;
  count: number;
};

export type MetricBreakdown = {
  metric: "FIFO D0" | "PRIOR D0" | "D0 Completion";
  title: string;
  stationCode: string;
  sourceUpdatedAt: string;
  totalPending: number;
  statuses: StatusCount[];
  trackingNumbersAvailable: boolean;
  note: string;
};

const STATUS_LABELS: Record<string, string> = {
  "arrived at sorting hub": "Arrived at Sorting Hub",
  cancelled: "Cancelled",
  "en-route to sorting hub": "En-route to Sorting Hub",
  "on hold": "On Hold",
  "on vehicle for delivery": "On Vehicle for Delivery",
  "pending reschedule": "Pending Reschedule",
};

const numberOrZero = (value: string | undefined) =>
  Number.parseInt((value ?? "").replaceAll(",", ""), 10) || 0;

const looksLikeStation = (value: string | undefined) =>
  /^C\d-[A-Z0-9]+-\d+-\d+$/i.test((value ?? "").trim());

function headerLabel(value: string | undefined): string {
  const raw = (value ?? "")
    .replaceAll("🎉", "")
    .replace(/SUCCESS/gi, "")
    .replace(/granular_status/gi, "")
    .replace(/Data Status/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (/grand total/i.test(raw)) return "Grand Total";
  return STATUS_LABELS[raw.toLowerCase()] ?? raw;
}

function extractBlock(
  row: string[],
  header: string[],
  stationCol: number,
): { statuses: StatusCount[]; totalPending: number } {
  const statuses: StatusCount[] = [];
  let totalPending = 0;
  const last = Math.max(row.length, header.length);
  for (let index = stationCol + 1; index < last; index += 1) {
    if (looksLikeStation(row[index])) break;
    const label = headerLabel(header[index]);
    if (label === "Grand Total") {
      totalPending = numberOrZero(row[index]);
      break;
    }
    if (STATUS_LABELS[label.toLowerCase()]) {
      statuses.push({ status: label, count: numberOrZero(row[index]) });
    }
  }
  return {
    statuses: statuses.filter((item) => item.count > 0),
    totalPending:
      totalPending || statuses.reduce((sum, item) => sum + item.count, 0),
  };
}

export function parseRawDataPivot(
  csv: string,
  stationCode = STATION_CODE,
): Record<"FIFO D0" | "PRIOR D0", MetricBreakdown> {
  const records = parse(csv, {
    bom: true,
    relax_column_count: true,
    skip_empty_lines: true,
  }) as string[][];
  if (!records.length) throw new Error("The Raw Data tab is empty");

  const header = records[0] ?? [];
  const sourceUpdatedAt =
    header[1]?.match(
      /\d{2}\/\d{2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2}\s+[AP]M/,
    )?.[0] ?? "";

  const stationRow =
    records.find((row) => row.some((cell) => cell?.trim() === stationCode)) ??
    null;
  if (!stationRow) {
    throw new Error(`Station ${stationCode} was not found in Raw Data`);
  }

  const stationCols = stationRow
    .map((cell, index) => (cell?.trim() === stationCode ? index : -1))
    .filter((index) => index >= 0);
  const fifoCol = stationCols[0] ?? 1;
  const priorCol = stationCols[1] ?? stationCols[0] ?? 8;
  const fifo = extractBlock(stationRow, header, fifoCol);
  const prior = extractBlock(stationRow, header, priorCol);

  const note =
    "This tab counts tracking_id by status. It does not list the tracking numbers themselves. Import the parcel dump (columns A-L) to show successful and pending tracking IDs.";

  return {
    "FIFO D0": {
      metric: "FIFO D0",
      title: "FIFO D0 left to attempt",
      stationCode,
      sourceUpdatedAt,
      totalPending: fifo.totalPending,
      statuses: fifo.statuses,
      trackingNumbersAvailable: false,
      note,
    },
    "PRIOR D0": {
      metric: "PRIOR D0",
      title: "PRIOR D0 left to success",
      stationCode,
      sourceUpdatedAt,
      totalPending: prior.totalPending,
      statuses: prior.statuses,
      trackingNumbersAvailable: false,
      note,
    },
  };
}

export async function fetchMetricBreakdown(
  metric: MetricBreakdown["metric"],
): Promise<MetricBreakdown> {
  if (metric === "D0 Completion") {
    return {
      metric,
      title: "D0 Completion leftover",
      stationCode: STATION_CODE,
      sourceUpdatedAt: "",
      totalPending: 0,
      statuses: [],
      trackingNumbersAvailable: false,
      note: "The Raw Data tab only pivots FIFO and PRIOR leftovers. Completion tracking IDs are not in this published structure.",
    };
  }

  const response = await fetch(`${RAW_DATA_CSV_URL}&cacheBust=${Date.now()}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`Raw Data tab returned HTTP ${response.status}`);
  }

  const parsed = parseRawDataPivot(await response.text());
  return parsed[metric];
}
