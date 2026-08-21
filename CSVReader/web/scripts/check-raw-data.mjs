import { parse } from "csv-parse/sync";

const OLD_SAMPLE = `"Data as FIFO D0 Left to Attempt ","19/08/2026 10:06:56 AM Left to Attempt COUNTA of tracking_id shp_dest_hub_name","granular_status Arrived at Sorting Hub","On Hold","Data Status On Vehicle for Delivery","Grand Total","🎉 SUCCESS ","Successfully updated 14628 rows in Columns A-L. PRIOR D0 Left to Success ","Left to Success COUNTA of tracking_id shp_dest_hub_name","granular_status Arrived at Sorting Hub","En-route to Sorting Hub","On Hold","On Vehicle for Delivery","Pending Reschedule","Grand Total"
"","C4-SBN-5-83","1418","","","1418","","","C4-SBN-5-83","1419","","","","","1419"
"","C4-NIL-5-85","1055","","","1055","","","C4-NIL-5-85","1056","","","","","1056"`;

const LIVE_SAMPLE = `"Data as FIFO D0 Left to Attempt ","21/08/2026 03:07:55 PM Left to Attempt COUNTA of tracking_id shp_dest_hub_name","granular_status Arrived at Sorting Hub","Cancelled","Data Status On Hold","On Vehicle for Delivery","🎉 SUCCESS Grand Total","Successfully updated 24723 rows in Columns A-L. PRIOR D0 Left to Success ","Left to Success COUNTA of tracking_id shp_dest_hub_name","granular_status Arrived at Sorting Hub","Cancelled","On Hold","On Vehicle for Delivery","Pending Reschedule","Grand Total"
"1048","C1-LKN-13-67","408","","11","698","1117","0","C1-LKN-13-67","410","","11","699","10","1130"
"682","C4-NIL-5-85","189","","","538","727","0","C4-NIL-5-85","189","","","538","3","730"`;

function station(csv) {
  const records = parse(csv, {
    bom: true,
    relax_column_count: true,
    skip_empty_lines: true,
  });
  const row = records.find((item) => item.includes("C4-NIL-5-85"));
  if (!row) throw new Error("station missing");
  return row;
}

const oldRow = station(OLD_SAMPLE);
if (Number(oldRow[5]) !== 1055) throw new Error("old FIFO total mismatch");
if (Number(oldRow[14]) !== 1056) throw new Error("old PRIOR total mismatch");

const liveRow = station(LIVE_SAMPLE);
if (Number(liveRow[6]) !== 727) throw new Error("live FIFO total mismatch");
if (Number(liveRow[14]) !== 730) throw new Error("live PRIOR total mismatch");
if (Number(liveRow[2]) !== 189) throw new Error("live AASH mismatch");
if (Number(liveRow[5]) !== 538) throw new Error("live OVFD mismatch");

const liveUrl =
  "https://docs.google.com/spreadsheets/d/1-crbMCbGgsHydSUQzhVpWHwS7wRniHt8TN9z-7XQ8Pk/gviz/tq?tqx=out:csv&gid=1615722066";
const liveCsv = await fetch(liveUrl).then((response) => {
  if (!response.ok) throw new Error(`live Raw Data HTTP ${response.status}`);
  return response.text();
});
if (!liveCsv.includes("C4-NIL-5-85")) {
  throw new Error("live Raw Data is missing Nilai");
}
if (!liveCsv.includes("Cancelled")) {
  throw new Error("live Raw Data is missing the Cancelled status column");
}

console.log("raw-data sample parse ok");
