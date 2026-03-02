from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = "sqlite+aiosqlite:///./dev.db"
    database_url_direct: str = "sqlite:///./dev.db"
    clerk_jwks_url: str = ""
    frontend_url: str = "http://localhost:3000"
    resend_api_key: str = ""
    email_from: str = "Poly-Myket <notifications@polymyket.com>"

    @model_validator(mode="after")
    def _ensure_async_driver(self) -> "Settings":
        """Rewrite postgresql:// to postgresql+asyncpg:// for the async engine."""
        if self.database_url.startswith("postgresql://"):
            self.database_url = self.database_url.replace(
                "postgresql://", "postgresql+asyncpg://", 1
            )
        return self


settings = Settings()
