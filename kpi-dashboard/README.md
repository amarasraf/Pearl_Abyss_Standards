# Pearl Abyss · Station KPI Dashboard

Daily KPI dashboard and **10:00 PM** automation alert for station **`C4-NIL-5-85`**.

Source sheet: [Google Spreadsheet](https://docs.google.com/spreadsheets/d/10v98YLO0emCB_ZdGE5E4W_wribgyKZJ-P2O6UDj3Tpk/edit?gid=1052551689#gid=1052551689)

## Features

- Live station KPI board (volume, success rate, attempt rate, SLA, fulfillment, pending, failed)
- Flexible Google Sheets CSV sync with header alias mapping
- Demo fallback when the sheet is private
- Daily alert cron at **22:00 Asia/Kuala_Lumpur** (`0 14 * * *` UTC)
- Slack / Discord webhook fan-out via `ALERT_WEBHOOK_URL`

## Quick start

```bash
cd kpi-dashboard
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Connect the Google Sheet

The sheet must be readable without Google login:

1. **Share** → General access → **Anyone with the link** → Viewer  
   **or**
2. **File → Share → Publish to web** (CSV) for tab `gid=1052551689`

Until that is done, the dashboard shows labeled demo KPIs for `C4-NIL-5-85`.

## Daily 10 PM alert

Configured in `vercel.json`:

```json
{ "path": "/api/cron/daily-alert", "schedule": "0 14 * * *" }
```

Set these env vars on Vercel (or locally):

| Variable | Purpose |
|---|---|
| `ALERT_WEBHOOK_URL` | Slack/Discord webhook for the nightly summary |
| `CRON_SECRET` | Protects the cron route (`Authorization: Bearer …`) |
| `STATION_NAME` | Defaults to `C4-NIL-5-85` |
| `ALERT_TIMEZONE` | Defaults to `Asia/Kuala_Lumpur` |

Manual trigger:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/daily-alert
```

## Docker

```bash
docker build -t pearl-kpi .
docker run -p 3000:3000 --env-file .env.local pearl-kpi
```

## API

- `GET /api/kpi` — station snapshot JSON
- `GET /api/cron/daily-alert` — run the nightly alert job
