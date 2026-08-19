# KPI Dashboard

Station KPI dashboard and daily 10 PM alert automation for **C4-NIL-5-85**, powered by your Google Sheet.

**Sheet:** [KPI Spreadsheet](https://docs.google.com/spreadsheets/d/10v98YLO0emCB_ZdGE5E4W_wribgyKZJ-P2O6UDj3Tpk/edit?gid=1052551689)

## Features

- Live KPI dashboard with metric cards, trend charts, and alert status
- Filters data for station `C4-NIL-5-85`
- Daily automated alert at **10:00 PM** (Asia/Kuala_Lumpur)
- Supports webhook (Discord/Slack/Telegram) and email notifications
- Google Apps Script alternative for sheet-native alerts

## Quick Start (Docker)

```bash
cd kpi-dashboard
cp .env.example .env
# Edit .env with your credentials
docker compose up --build
```

- Dashboard: http://localhost:3000
- API: http://localhost:8000

## Connect Google Sheets

1. Create a [Google Cloud service account](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Enable the Google Sheets API
3. Download the JSON key and paste it into `GOOGLE_SERVICE_ACCOUNT_JSON` in `.env`
4. Share your spreadsheet with the service account email (Viewer access)
5. Set `USE_MOCK_DATA=false`

## Alert Channels

Configure at least one in `.env`:

| Variable | Description |
|---|---|
| `ALERT_WEBHOOK_URL` | Discord/Slack/Telegram webhook URL |
| `ALERT_EMAIL_TO` | Email address for daily reports |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASSWORD` | SMTP settings for email |

## Manual Alert Test

```bash
curl -X POST http://localhost:8000/api/alerts/trigger
```

## Google Apps Script (No Server Required)

If you prefer alerts directly inside Google Sheets:

1. Open your sheet → **Extensions → Apps Script**
2. Paste `google-apps-script/Code.gs`
3. Update `ALERT_EMAIL`
4. Run `setupDailyTrigger()` once
5. Run `createDashboard()` to add a Dashboard tab

## Schedule

| Setting | Value |
|---|---|
| Time | 10:00 PM daily |
| Timezone | Asia/Kuala_Lumpur |
| Station | C4-NIL-5-85 |
