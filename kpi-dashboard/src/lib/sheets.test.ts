/**
 * Lightweight parse smoke test (no test runner required).
 * Run: npx tsx src/lib/sheets.test.ts
 */

import { parseStationKpis } from "./sheets";

const csv = `Station,Date,Volume,Success Rate,Attempt Rate,SLA,Pending,Failed
C4-NIL-5-85,2026-08-18,1200,91.2%,96.5%,94.0%,40,35
C4-OTHER-1-01,2026-08-18,900,99.0%,99.0%,99.0%,1,1
C4-NIL-5-85,2026-08-19,1284,93.1%,97.4%,94.8%,48,40
`;

const rows = parseStationKpis(csv, "C4-NIL-5-85");

if (rows.length !== 2) {
  throw new Error(`Expected 2 station rows, got ${rows.length}`);
}
if (rows[0].date !== "2026-08-19") {
  throw new Error(`Expected newest date first, got ${rows[0].date}`);
}
const success = rows[0].metrics.find((m) => m.key === "successRate");
if (!success || success.percent !== 93.1) {
  throw new Error(`Expected successRate 93.1, got ${JSON.stringify(success)}`);
}

console.log("sheets.parseStationKpis OK", {
  rows: rows.length,
  latestDate: rows[0].date,
  successRate: success.percent,
});
