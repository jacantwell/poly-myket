from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = "sqlite+aiosqlite:///./dev.db"
    database_url_direct: str = "sqlite:///./dev.db"
    clerk_jwks_url: str = ""
    frontend_url: str = "http://localhost:3000"


settings = Settings()
