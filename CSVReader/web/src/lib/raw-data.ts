import { parse } from "csv-parse/sync";
import { STATION_CODE } from "@/lib/kpi";

export const RAW_DATA_CSV_URL =
  process.env.GOOGLE_RAW_CSV_URL ??
  "https://docs.google.com/spreadsheets/d/13FkrRLKS1HBhIYQtQTEyZ-QD4pa0_169VUTx5HGY8F0/gviz/tq?tqx=out:csv&gid=2124284441";

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

const FIFO_STATUSES = [
  "Arrived at Sorting Hub",
  "On Hold",
  "On Vehicle for Delivery",
];

const PRIOR_STATUSES = [
  "Arrived at Sorting Hub",
  "En-route to Sorting Hub",
  "On Hold",
  "On Vehicle for Delivery",
  "Pending Reschedule",
];

const numberOrZero = (value: string | undefined) =>
  Number.parseInt((value ?? "").replaceAll(",", ""), 10) || 0;

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
  const sourceUpdatedAt = header[1]?.match(
    /\d{2}\/\d{2}\/\d{4}\s+\d{1,2}:\d{2}:\d{2}\s+[AP]M/,
  )?.[0] ?? "";

  const stationRow =
    records.find(
      (row) => row[1]?.trim() === stationCode || row[8]?.trim() === stationCode,
    ) ?? null;
  if (!stationRow) {
    throw new Error(`Station ${stationCode} was not found in Raw Data`);
  }

  const fifoStatuses = FIFO_STATUSES.map((status, index) => ({
    status,
    count: numberOrZero(stationRow[2 + index]),
  })).filter((item) => item.count > 0);

  const priorStatuses = PRIOR_STATUSES.map((status, index) => ({
    status,
    count: numberOrZero(stationRow[9 + index]),
  })).filter((item) => item.count > 0);

  const note =
    "This tab counts tracking_id by status. It does not list the tracking numbers themselves. Import the parcel dump (columns A-L) to show successful and pending tracking IDs.";

  return {
    "FIFO D0": {
      metric: "FIFO D0",
      title: "FIFO D0 left to attempt",
      stationCode,
      sourceUpdatedAt,
      totalPending: numberOrZero(stationRow[5]),
      statuses: fifoStatuses,
      trackingNumbersAvailable: false,
      note,
    },
    "PRIOR D0": {
      metric: "PRIOR D0",
      title: "PRIOR D0 left to success",
      stationCode,
      sourceUpdatedAt,
      totalPending: numberOrZero(stationRow[14]),
      statuses: priorStatuses,
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
