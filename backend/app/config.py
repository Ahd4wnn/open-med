from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    RXNAV_BASE_URL: str = "https://rxnav.nlm.nih.gov/REST"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
