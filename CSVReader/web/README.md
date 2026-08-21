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

To keep leftover-status drilldown live, import the master's `Raw Data` tab into the NILAI KPI bridge:

```
=IMPORTRANGE("MASTER_SHEET_ID","'Raw Data'!A:ZZ")
```

Then set `GOOGLE_RAW_CSV_URL` to that tab's CSV export. The published Raw Data tab counts `tracking_id` by status; it does not list tracking numbers. Parcel-level tracking IDs require the 14,628-row dump in columns A-L.

## Security

Never expose `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_SECRET`, or
`CRON_SECRET` as `NEXT_PUBLIC_*` variables. Only emails listed in
`ADMIN_EMAILS` or `ALLOWED_EMAILS` can sign in.
