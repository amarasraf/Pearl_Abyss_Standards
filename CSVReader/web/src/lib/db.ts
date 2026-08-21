import { neon } from "@neondatabase/serverless";
import type { KpiSnapshot } from "@/lib/kpi";
import { retentionCutoff } from "@/lib/kpi";

type SnapshotRow = {
  station_code: string;
  station_name: string;
  zone: string;
  source_updated_at: string;
  captured_at: string;
  recorded_date: string;
  metrics: KpiSnapshot["metrics"] | string;
};

type AuditRow = {
  id: string;
  email: string;
  event_type: string;
  event_at: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | string;
};

let schemaPromise: Promise<void> | null = null;

function sqlClient() {
  const url =
    process.env.DATABASE_URL ??
    process.env.STORAGE_URL ??
    process.env.POSTGRES_URL;
  if (!url) {
    throw new Error(
      "No database URL is configured (DATABASE_URL or STORAGE_URL)",
    );
  }
  return neon(url);
}

export function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const sql = sqlClient();
      await sql`
        CREATE TABLE IF NOT EXISTS daily_kpi_snapshot (
          station_code TEXT NOT NULL,
          recorded_date DATE NOT NULL,
          station_name TEXT NOT NULL,
          zone TEXT NOT NULL,
          source_updated_at TEXT NOT NULL,
          captured_at TIMESTAMPTZ NOT NULL,
          metrics JSONB NOT NULL,
          PRIMARY KEY (station_code, recorded_date)
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS audit_event (
          id BIGSERIAL PRIMARY KEY,
          email TEXT NOT NULL,
          event_type TEXT NOT NULL,
          event_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          ip_address TEXT,
          user_agent TEXT,
          metadata JSONB NOT NULL DEFAULT '{}'::jsonb
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS audit_event_email_time_idx
        ON audit_event (email, event_at DESC)
      `;
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

function snapshotFromRow(row: SnapshotRow): KpiSnapshot {
  return {
    stationCode: row.station_code,
    stationName: row.station_name,
    zone: row.zone,
    sourceUpdatedAt: row.source_updated_at,
    capturedAt: new Date(row.captured_at).toISOString(),
    recordedDate: row.recorded_date,
    metrics:
      typeof row.metrics === "string" ? JSON.parse(row.metrics) : row.metrics,
  };
}

export async function saveSnapshot(snapshot: KpiSnapshot) {
  await ensureSchema();
  const sql = sqlClient();
  const metrics = JSON.stringify(snapshot.metrics);
  await sql`
    INSERT INTO daily_kpi_snapshot (
      station_code, recorded_date, station_name, zone,
      source_updated_at, captured_at, metrics
    )
    VALUES (
      ${snapshot.stationCode}, ${snapshot.recordedDate}, ${snapshot.stationName}, ${snapshot.zone},
      ${snapshot.sourceUpdatedAt}, ${snapshot.capturedAt}, ${metrics}::jsonb
    )
    ON CONFLICT (station_code, recorded_date) DO UPDATE SET
      station_name = EXCLUDED.station_name,
      zone = EXCLUDED.zone,
      source_updated_at = EXCLUDED.source_updated_at,
      captured_at = EXCLUDED.captured_at,
      metrics = EXCLUDED.metrics
  `;
  await sql`
    DELETE FROM daily_kpi_snapshot
    WHERE recorded_date < ${retentionCutoff()}::date
  `;
}

export async function getSnapshots(
  stationCode: string,
  limit = 731,
): Promise<KpiSnapshot[]> {
  await ensureSchema();
  const sql = sqlClient();
  const rows = (await sql`
    SELECT
      station_code, station_name, zone, source_updated_at,
      captured_at::text, recorded_date::text, metrics
    FROM daily_kpi_snapshot
    WHERE station_code = ${stationCode}
    ORDER BY recorded_date DESC
    LIMIT ${limit}
  `) as SnapshotRow[];
  return rows.map(snapshotFromRow);
}

export async function getSnapshot(
  stationCode: string,
  recordedDate: string,
): Promise<KpiSnapshot | null> {
  await ensureSchema();
  const sql = sqlClient();
  const rows = (await sql`
    SELECT
      station_code, station_name, zone, source_updated_at,
      captured_at::text, recorded_date::text, metrics
    FROM daily_kpi_snapshot
    WHERE station_code = ${stationCode} AND recorded_date = ${recordedDate}::date
    LIMIT 1
  `) as SnapshotRow[];
  return rows[0] ? snapshotFromRow(rows[0]) : null;
}

export async function logAudit(input: {
  email: string;
  eventType: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await ensureSchema();
  const sql = sqlClient();
  const metadata = JSON.stringify(input.metadata ?? {});
  await sql`
    INSERT INTO audit_event (email, event_type, ip_address, user_agent, metadata)
    VALUES (
      ${input.email.toLowerCase()},
      ${input.eventType},
      ${input.ipAddress ?? null},
      ${input.userAgent ?? null},
      ${metadata}::jsonb
    )
  `;
}

export async function getAuditEvents(limit = 500) {
  await ensureSchema();
  const sql = sqlClient();
  const rows = (await sql`
    SELECT
      id::text, email, event_type, event_at::text,
      ip_address, user_agent, metadata
    FROM audit_event
    ORDER BY event_at DESC
    LIMIT ${limit}
  `) as AuditRow[];
  return rows.map((row) => ({
    ...row,
    event_at: new Date(row.event_at).toISOString(),
    metadata:
      typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata,
  }));
}
