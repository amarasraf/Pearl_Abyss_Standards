/**
 * KPI Dashboard & Daily Alert — Google Apps Script
 *
 * SETUP:
 * 1. Open your Google Sheet → Extensions → Apps Script
 * 2. Paste this entire file and save
 * 3. Update STATION_NAME and ALERT_EMAIL below
 * 4. Run setupDailyTrigger() once to enable 10 PM daily alerts
 * 5. Run createDashboard() to build a Dashboard tab
 */

const SHEET_GID = 1052551689;
const STATION_NAME = "C4-NIL-5-85";
const ALERT_EMAIL = "your-email@example.com"; // Change this
const SLA_TARGET = 90;

function getKpiSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  for (const sheet of sheets) {
    if (sheet.getSheetId() === SHEET_GID) return sheet;
  }
  return ss.getActiveSheet();
}

function findColumn_(headers, candidates) {
  const normalized = headers.map((h) => String(h).toLowerCase().trim());
  for (const candidate of candidates) {
    const idx = normalized.findIndex((h) => h.includes(candidate));
    if (idx !== -1) return idx;
  }
  return -1;
}

function getStationRow_() {
  const sheet = getKpiSheet_();
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return null;

  const headers = data[0];
  const stationCol = findColumn_(headers, ["station", "hub", "route"]);
  if (stationCol === -1) return { headers, row: data[data.length - 1] };

  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][stationCol]).toUpperCase().includes(STATION_NAME)) {
      return { headers, row: data[i] };
    }
  }
  return null;
}

function buildAlertMessage_(headers, row) {
  const lines = [`KPI Daily Alert — ${STATION_NAME}`, ""];
  let alertCount = 0;

  headers.forEach((header, i) => {
    const value = row[i];
    if (value === "" || value === null) return;
    const headerStr = String(header);
    const isPercent = headerStr.includes("%") || String(headerStr).toLowerCase().includes("rate");

    if (isPercent && typeof value === "number" && value < SLA_TARGET) {
      lines.push(`⚠️ ${headerStr}: ${value}% (below ${SLA_TARGET}% target)`);
      alertCount++;
    } else {
      lines.push(`• ${headerStr}: ${value}`);
    }
  });

  if (alertCount === 0) {
    lines.push("", "✅ All metrics within acceptable range.");
  }

  return lines.join("\n");
}

function sendDailyAlert() {
  const result = getStationRow_();
  if (!result) {
    MailApp.sendEmail(ALERT_EMAIL, `[KPI] No data for ${STATION_NAME}`, "No matching station data found in the sheet.");
    return;
  }

  const message = buildAlertMessage_(result.headers, result.row);
  MailApp.sendEmail(ALERT_EMAIL, `[KPI Alert] ${STATION_NAME} — Daily Report`, message);
}

function setupDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach((t) => {
    if (t.getHandlerFunction() === "sendDailyAlert") ScriptApp.deleteTrigger(t);
  });

  ScriptApp.newTrigger("sendDailyAlert")
    .timeBased()
    .atHour(22)
    .everyDays(1)
    .inTimezone("Asia/Kuala_Lumpur")
    .create();

  SpreadsheetApp.getUi().alert("Daily 10 PM alert trigger created for " + STATION_NAME);
}

function createDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let dash = ss.getSheetByName("Dashboard");
  if (!dash) dash = ss.insertSheet("Dashboard");
  dash.clear();

  const result = getStationRow_();
  if (!result) {
    dash.getRange("A1").setValue("No data found for " + STATION_NAME);
    return;
  }

  dash.getRange("A1").setValue(`KPI Dashboard — ${STATION_NAME}`).setFontSize(16).setFontWeight("bold");
  dash.getRange("A2").setValue("Last updated: " + new Date().toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" }));

  const metrics = [["Metric", "Value", "Status"]];
  result.headers.forEach((header, i) => {
    const value = result.row[i];
    if (value === "" || value === null) return;
    const headerStr = String(header);
    let status = "OK";
    if ((headerStr.includes("%") || headerStr.toLowerCase().includes("rate")) && typeof value === "number") {
      status = value >= SLA_TARGET ? "✅ Good" : value >= SLA_TARGET * 0.95 ? "⚠️ Warning" : "❌ Critical";
    }
    metrics.push([headerStr, value, status]);
  });

  dash.getRange(4, 1, metrics.length, 3).setValues(metrics);
  dash.getRange(4, 1, 1, 3).setFontWeight("bold").setBackground("#8b5cf6").setFontColor("#ffffff");
  dash.autoResizeColumns(1, 3);

  SpreadsheetApp.getUi().alert("Dashboard tab created for " + STATION_NAME);
}
