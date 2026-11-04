"""Backend settings loaded from environment / backend/.env."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_ENV_FILE, extra="ignore")

    bitrefill_api_key: str = ""
    bitrefill_base_url: str = "https://api.bitrefill.com/v2"
    public_webhook_url: str = ""
    database_url: str = "sqlite:///./lifeos.db"
    cors_origins: str = "http://localhost:3000,http://localhost:3001,http://localhost:3002"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def sqlite_path(self) -> str:
        # Accept both sqlite:///./x.db and a bare path.
        url = self.database_url
        if url.startswith("sqlite:///"):
            return url[len("sqlite:///") :]
        return url


settings = Settings()
