# Nilai KPI Web Dashboard

Protected web access and two-year online history for station `C4-NIL-5-85`.

## Features

- Live Google Sheets KPI view
- Daily 10 PM Malaysia-time capture through Vercel Cron
- Neon Postgres history with two-year automatic retention
- Google login restricted by email allowlist
- Admin audit of logins, dashboard views, and history views
- Clickable FIFO / PRIOR cards showing leftover parcel status counts from the Raw Data pivot

## Local setup

Copy `.env.example` to `.env.local` and configure every required value.

```bash
npm install
npm run dev
```

For Google OAuth, configure these authorized redirect URIs:

- Local: `http://localhost:3000/api/auth/callback/google`
- Production: `https://YOUR_DOMAIN/api/auth/callback/google`

## Vercel setup

1. Import the repository with root directory `CSVReader/web`.
2. Add a Neon Postgres integration from the Vercel Marketplace.
3. Add all variables from `.env.example` to the Production environment.
4. Deploy to production. Cron jobs do not run on preview deployments.

The cron schedule is `0 14 * * *`, which is 10 PM in `Asia/Kuala_Lumpur`.

The NILAI KPI workbook already has a live `Raw Data` tab (`gid=1615722066`) imported from the master sheet. Drilldown reads:

```
https://docs.google.com/spreadsheets/d/1-crbMCbGgsHydSUQzhVpWHwS7wRniHt8TN9z-7XQ8Pk/gviz/tq?tqx=out:csv&gid=1615722066
```

Set `GOOGLE_RAW_CSV_URL` to that CSV if you override the default. The tab counts `tracking_id` by status; it does not list tracking numbers. If you find the A–L parcel dump tab, import it with:

```
=IMPORTRANGE("10v98YLO0emCB_ZdGE5E4W_wribgyKZJ-P2O6UDj3Tpk","'PASTE_DUMP_TAB_NAME'!A:L")
```

An Apps Script helper is in `scripts/import-master-tabs.gs`.

## Security

Never expose `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_SECRET`, or
`CRON_SECRET` as `NEXT_PUBLIC_*` variables. Only emails listed in
`ADMIN_EMAILS` or `ALLOWED_EMAILS` can sign in.
