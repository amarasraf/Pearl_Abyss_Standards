import json
import logging
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

import gspread
from google.oauth2.service_account import Credentials

from app.config import Settings

logger = logging.getLogger(__name__)

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
]


class SheetsClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._worksheet = None

    def _get_worksheet(self):
        if self._worksheet is not None:
            return self._worksheet

        if not self.settings.google_service_account_json:
            raise ValueError("GOOGLE_SERVICE_ACCOUNT_JSON is not configured")

        credentials_info = json.loads(self.settings.google_service_account_json)
        credentials = Credentials.from_service_account_info(credentials_info, scopes=SCOPES)
        client = gspread.authorize(credentials)
        spreadsheet = client.open_by_key(self.settings.google_sheet_id)
        self._worksheet = spreadsheet.get_worksheet_by_id(int(self.settings.google_sheet_gid))
        if self._worksheet is None:
            raise ValueError(f"Worksheet gid={self.settings.google_sheet_gid} not found")
        return self._worksheet

    def fetch_rows(self) -> list[dict[str, Any]]:
        worksheet = self._get_worksheet()
        records = worksheet.get_all_records()
        logger.info("Fetched %s rows from Google Sheet", len(records))
        return records


def get_mock_rows(station: str) -> list[dict[str, Any]]:
    today = datetime.now(ZoneInfo("Asia/Kuala_Lumpur")).strftime("%Y-%m-%d")
    return [
        {
            "Date": today,
            "Station": station,
            "Total Parcels": 142,
            "Delivered": 128,
            "Failed": 6,
            "Pending": 8,
            "Success Rate %": 90.1,
            "On-Time %": 87.5,
            "COD Collected (RM)": 4520.50,
            "Attempt Rate %": 94.4,
            "SLA Target %": 90.0,
            "Ranking": 12,
        },
        {
            "Date": "2026-08-18",
            "Station": station,
            "Total Parcels": 138,
            "Delivered": 121,
            "Failed": 9,
            "Pending": 8,
            "Success Rate %": 87.7,
            "On-Time %": 85.2,
            "COD Collected (RM)": 4180.00,
            "Attempt Rate %": 92.0,
            "SLA Target %": 90.0,
            "Ranking": 15,
        },
        {
            "Date": "2026-08-17",
            "Station": station,
            "Total Parcels": 150,
            "Delivered": 135,
            "Failed": 7,
            "Pending": 8,
            "Success Rate %": 90.0,
            "On-Time %": 88.0,
            "COD Collected (RM)": 4890.75,
            "Attempt Rate %": 95.3,
            "SLA Target %": 90.0,
            "Ranking": 10,
        },
    ]
