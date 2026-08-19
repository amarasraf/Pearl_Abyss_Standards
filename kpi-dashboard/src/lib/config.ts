/**
 * Station KPI dashboard configuration.
 * Station is fixed to the operator's assigned hub unless overridden by env.
 */

export const STATION_NAME =
  process.env.STATION_NAME?.trim() || "C4-NIL-5-85";

/** Google Sheet backing the KPI source. */
export const SHEET_ID =
  process.env.GOOGLE_SHEET_ID?.trim() ||
  "10v98YLO0emCB_ZdGE5E4W_wribgyKZJ-P2O6UDj3Tpk";

export const SHEET_GID =
  process.env.GOOGLE_SHEET_GID?.trim() || "1052551689";

/**
 * Daily alert fires at 10:00 PM in this timezone.
 * UTC+8 (MY / PH / SG) maps Vercel cron `0 14 * * *` → 22:00 local.
 */
export const ALERT_TIMEZONE =
  process.env.ALERT_TIMEZONE?.trim() || "Asia/Kuala_Lumpur";

export const APP_NAME = "Pearl Abyss · Station KPI";

/** Header aliases used to auto-map spreadsheet columns → KPI fields. */
export const COLUMN_ALIASES = {
  station: [
    "station",
    "station name",
    "station_name",
    "station id",
    "station_id",
    "hub",
    "hub name",
    "site",
    "location",
  ],
  date: ["date", "day", "report date", "report_date", "kpi date"],
  volume: [
    "volume",
    "parcels",
    "parcel",
    "total parcels",
    "total volume",
    "assigned",
    "shipment",
    "shipments",
  ],
  successRate: [
    "success rate",
    "success_rate",
    "sr",
    "delivery success",
    "delivered %",
    "delivered%",
    "success %",
    "success%",
  ],
  attemptRate: [
    "attempt rate",
    "attempt_rate",
    "attempt %",
    "attempt%",
    "1st attempt",
    "first attempt",
    "fasr",
  ],
  sla: [
    "sla",
    "sla %",
    "sla%",
    "on time",
    "on-time",
    "ontime",
    "otd",
    "service level",
  ],
  fulfillment: [
    "fulfillment",
    "fulfillment rate",
    "fulfillment%",
    "completion",
    "completion rate",
  ],
  pending: ["pending", "backlog", "open", "outstanding", "undelivered"],
  failed: ["failed", "fail", "failure", "rts", "return", "unsuccessful"],
  delivered: ["delivered", "success count", "successful"],
  target: ["target", "kpi target", "goal", "threshold"],
  status: ["status", "rag", "flag", "result"],
  remarks: ["remarks", "comment", "notes", "note", "action"],
} as const;

export type MetricKey = keyof typeof COLUMN_ALIASES;
