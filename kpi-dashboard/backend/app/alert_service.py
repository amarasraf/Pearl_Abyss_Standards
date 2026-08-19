import logging
import smtplib
from email.message import EmailMessage

import httpx

from app.config import Settings
from app.models import DashboardResponse

logger = logging.getLogger(__name__)


class AlertService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def format_message(self, dashboard: DashboardResponse) -> str:
        lines = [
            f"KPI Daily Alert — {dashboard.station}",
            f"Report Date: {dashboard.summary.date or 'N/A'}",
            f"Overall Score: {dashboard.summary.overall_score or 'N/A'}",
            "",
            "Key Metrics:",
        ]

        for metric in dashboard.summary.metrics[:12]:
            unit = metric.unit or ""
            target = f" (target: {metric.target}{unit})" if metric.target is not None else ""
            status = f" [{metric.status.upper()}]" if metric.status != "neutral" else ""
            lines.append(f"  • {metric.name}: {metric.value}{unit}{target}{status}")

        if dashboard.summary.alerts:
            lines.extend(["", "⚠️ Alerts:"])
            lines.extend(f"  • {alert}" for alert in dashboard.summary.alerts)
        else:
            lines.extend(["", "✅ All metrics within acceptable range."])

        lines.append("")
        lines.append(f"Last updated: {dashboard.last_updated}")
        return "\n".join(lines)

    async def send_webhook(self, message: str) -> bool:
        if not self.settings.alert_webhook_url:
            logger.warning("ALERT_WEBHOOK_URL not configured; skipping webhook alert")
            return False

        payload = {"text": message, "content": message}
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(self.settings.alert_webhook_url, json=payload)
            response.raise_for_status()
        logger.info("Webhook alert sent successfully")
        return True

    def send_email(self, message: str, subject: str) -> bool:
        if not self.settings.alert_email_to or not self.settings.smtp_host:
            logger.warning("Email alert settings incomplete; skipping email alert")
            return False

        email = EmailMessage()
        email["Subject"] = subject
        email["From"] = self.settings.smtp_user or self.settings.alert_email_to
        email["To"] = self.settings.alert_email_to
        email.set_content(message)

        with smtplib.SMTP(self.settings.smtp_host, self.settings.smtp_port) as server:
            server.starttls()
            if self.settings.smtp_user and self.settings.smtp_password:
                server.login(self.settings.smtp_user, self.settings.smtp_password)
            server.send_message(email)

        logger.info("Email alert sent to %s", self.settings.alert_email_to)
        return True

    async def send_daily_alert(self, dashboard: DashboardResponse) -> dict[str, bool]:
        message = self.format_message(dashboard)
        subject = f"[KPI Alert] {dashboard.station} — {dashboard.summary.date or 'Daily Report'}"

        webhook_sent = False
        email_sent = False

        try:
            webhook_sent = await self.send_webhook(message)
        except Exception as exc:
            logger.exception("Webhook alert failed: %s", exc)

        try:
            email_sent = self.send_email(message, subject)
        except Exception as exc:
            logger.exception("Email alert failed: %s", exc)

        return {"webhook": webhook_sent, "email": email_sent, "message": True}
