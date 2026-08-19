import logging
from contextlib import asynccontextmanager
from datetime import datetime
from zoneinfo import ZoneInfo

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.alert_service import AlertService
from app.config import Settings, get_settings
from app.kpi_engine import KpiEngine
from app.models import DashboardResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def run_daily_alert() -> None:
    settings = get_settings()
    engine = KpiEngine(settings)
    alerts = AlertService(settings)
    dashboard = engine.build_dashboard()
    result = await alerts.send_daily_alert(dashboard)
    logger.info("Daily alert executed at %s: %s", datetime.now(ZoneInfo(settings.timezone)), result)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    trigger = CronTrigger(
        hour=settings.alert_hour,
        minute=settings.alert_minute,
        timezone=settings.timezone,
    )
    scheduler.add_job(run_daily_alert, trigger=trigger, id="daily_kpi_alert", replace_existing=True)
    scheduler.start()
    logger.info(
        "Scheduled daily KPI alert at %02d:%02d (%s)",
        settings.alert_hour,
        settings.alert_minute,
        settings.timezone,
    )
    yield
    scheduler.shutdown(wait=False)


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="KPI Dashboard API", version="1.0.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok", "station": settings.station_name}

    @app.get("/api/dashboard", response_model=DashboardResponse)
    async def get_dashboard(station: str | None = None) -> DashboardResponse:
        engine = KpiEngine(get_settings())
        return engine.build_dashboard(station=station)

    @app.post("/api/alerts/trigger")
    async def trigger_alert(station: str | None = None) -> dict:
        settings = get_settings()
        engine = KpiEngine(settings)
        alerts = AlertService(settings)
        dashboard = engine.build_dashboard(station=station)
        result = await alerts.send_daily_alert(dashboard)
        return {
            "status": "sent",
            "station": dashboard.station,
            "channels": result,
            "preview": alerts.format_message(dashboard),
        }

    @app.get("/api/schedule")
    async def get_schedule() -> dict:
        job = scheduler.get_job("daily_kpi_alert")
        if job is None:
            raise HTTPException(status_code=404, detail="Scheduler job not found")
        next_run = job.next_run_time
        return {
            "station": settings.station_name,
            "timezone": settings.timezone,
            "schedule": f"Daily at {settings.alert_hour:02d}:{settings.alert_minute:02d}",
            "next_run": next_run.isoformat() if next_run else None,
        }

    return app


app = create_app()
