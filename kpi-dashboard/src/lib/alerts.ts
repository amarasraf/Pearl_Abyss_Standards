/**
 * Daily KPI alert dispatcher.
 * Supports Slack/Discord-compatible webhooks and optional email webhook fan-out.
 */

import { ALERT_TIMEZONE, APP_NAME, STATION_NAME } from "./config";
import { getKpiSnapshot, formatMetricValue } from "./sheets";
import type { AlertFinding, KpiSnapshot } from "./types";

export interface AlertDispatchResult {
  ok: boolean;
  channel: string;
  detail: string;
}

function severityEmoji(severity: AlertFinding["severity"]): string {
  if (severity === "critical") return "🔴";
  if (severity === "warning") return "🟡";
  return "🟢";
}

export function buildAlertMessage(snapshot: KpiSnapshot): string {
  const localNow = new Intl.DateTimeFormat("en-GB", {
    timeZone: ALERT_TIMEZONE,
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date());

  const lines: string[] = [
    `*${APP_NAME}* — Daily 10 PM Alert`,
    `Station: \`${snapshot.station}\``,
    `When: ${localNow} (${ALERT_TIMEZONE})`,
    `Source: ${snapshot.sourceLabel}`,
    "",
  ];

  if (snapshot.latest) {
    lines.push(`Latest date: ${snapshot.latest.date ?? "n/a"}`);
    for (const metric of snapshot.latest.metrics.slice(0, 8)) {
      lines.push(`• ${metric.label}: *${formatMetricValue(metric)}*`);
    }
    lines.push("");
  }

  lines.push("*Findings*");
  for (const finding of snapshot.alerts) {
    lines.push(
      `${severityEmoji(finding.severity)} ${finding.title} — ${finding.detail}`,
    );
  }

  if (snapshot.error) {
    lines.push("", `⚠️ Data note: ${snapshot.error}`);
  }

  return lines.join("\n");
}

async function postWebhook(
  url: string,
  text: string,
): Promise<AlertDispatchResult> {
  const payloads = [
    // Slack incoming webhook
    { text },
    // Discord webhook
    { content: text.slice(0, 1900) },
  ];

  let lastError = "Unknown webhook error";
  for (const body of payloads) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.ok || response.status === 204) {
        return {
          ok: true,
          channel: "webhook",
          detail: `Delivered via webhook (HTTP ${response.status}).`,
        };
      }
      lastError = `HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  return { ok: false, channel: "webhook", detail: lastError };
}

/**
 * Runs the end-of-day KPI check and fans out notifications.
 * Safe to call from Vercel Cron (`/api/cron/daily-alert`).
 */
export async function runDailyAlert(): Promise<{
  snapshot: KpiSnapshot;
  message: string;
  results: AlertDispatchResult[];
}> {
  const snapshot = await getKpiSnapshot();
  const message = buildAlertMessage(snapshot);
  const results: AlertDispatchResult[] = [];

  const webhook = process.env.ALERT_WEBHOOK_URL?.trim();
  if (webhook) {
    results.push(await postWebhook(webhook, message));
  } else {
    results.push({
      ok: true,
      channel: "log",
      detail: "ALERT_WEBHOOK_URL not set — alert logged only.",
    });
    console.info(`[daily-alert:${STATION_NAME}]`, message);
  }

  const emailHook = process.env.ALERT_EMAIL_WEBHOOK_URL?.trim();
  if (emailHook) {
    results.push(
      await postWebhook(
        emailHook,
        JSON.stringify({
          to: process.env.ALERT_EMAIL,
          subject: `[KPI Alert] ${STATION_NAME} — daily 10 PM`,
          text: message,
        }),
      ),
    );
  }

  return { snapshot, message, results };
}
