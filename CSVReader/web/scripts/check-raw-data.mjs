import { parse } from "csv-parse/sync";

const SAMPLE = `"Data as FIFO D0 Left to Attempt ","19/08/2026 10:06:56 AM Left to Attempt COUNTA of tracking_id shp_dest_hub_name","granular_status Arrived at Sorting Hub","On Hold","Data Status On Vehicle for Delivery","Grand Total","🎉 SUCCESS ","Successfully updated 14628 rows in Columns A-L. PRIOR D0 Left to Success ","Left to Success COUNTA of tracking_id shp_dest_hub_name","granular_status Arrived at Sorting Hub","En-route to Sorting Hub","On Hold","On Vehicle for Delivery","Pending Reschedule","Grand Total"
"","C4-SBN-5-83","1418","","","1418","","","C4-SBN-5-83","1419","","","","","1419"
"","C4-NIL-5-85","1055","","","1055","","","C4-NIL-5-85","1056","","","","","1056"`;

const records = parse(SAMPLE, {
  bom: true,
  relax_column_count: true,
  skip_empty_lines: true,
});
const station = records.find((row) => row[1] === "C4-NIL-5-85");
if (!station) throw new Error("station missing");
if (Number(station[5]) !== 1055) throw new Error("FIFO total mismatch");
if (Number(station[14]) !== 1056) throw new Error("PRIOR total mismatch");
console.log("raw-data sample parse ok");
