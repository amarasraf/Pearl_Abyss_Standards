/**
 * Paste into the NILAI KPI spreadsheet:
 * Extensions → Apps Script → replace Code.gs → Save → Run importMasterTabs.
 *
 * First run will ask you to authorize. IMPORTRANGE still needs one
 * "Allow access" click in the sheet if the cell shows #REF!.
 */
var MASTER_ID = "10v98YLO0emCB_ZdGE5E4W_wribgyKZJ-P2O6UDj3Tpk";
var STATION_CODE = "C4-NIL-5-85";

function importMasterTabs() {
  var ss = SpreadsheetApp.getActive();
  writeImport_(ss, "Today KPI", "'Today KPI'!A:ZZ", false);
  writeImport_(ss, "Raw Data", "'Raw Data'!A:ZZ", true);
}

function importNilaiRawDataOnly() {
  var ss = SpreadsheetApp.getActive();
  var sheet = ensureSheet_(ss, "Raw Data");
  sheet.clear();
  sheet.getRange("A1").setFormula(
    '=QUERY(IMPORTRANGE("' + MASTER_ID + '","\'Raw Data\'!A:ZZ"),' +
      '"select * where Col2 = \'' + STATION_CODE +
      '\' or Col9 = \'' + STATION_CODE + '\'",1)',
  );
}

function writeImport_(ss, tabName, masterRange, replaceIfExists) {
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    sheet = ss.insertSheet(tabName);
  } else if (!replaceIfExists && sheet.getRange("A1").getFormula()) {
    return;
  }
  sheet.getRange("A1").setFormula(
    '=IMPORTRANGE("' + MASTER_ID + '","' + masterRange + '")',
  );
}

function ensureSheet_(ss, tabName) {
  return ss.getSheetByName(tabName) || ss.insertSheet(tabName);
}
