from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    google_sheet_id: str = "10v98YLO0emCB_ZdGE5E4W_wribgyKZJ-P2O6UDj3Tpk"
    google_sheet_gid: str = "1052551689"
    google_service_account_json: str = ""

    station_name: str = "C4-NIL-5-85"
    timezone: str = "Asia/Kuala_Lumpur"
    alert_hour: int = 22
    alert_minute: int = 0

    alert_webhook_url: str = ""
    alert_email_to: str = ""
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""

    use_mock_data: bool = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
