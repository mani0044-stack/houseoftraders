import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
  PROJECT_NAME: str = "AlgoTrade Production Platform"
  API_V1_STR: str = "/api"
  
  # Security
  SECRET_KEY: str = os.getenv("SECRET_KEY", "3TvTpxnEcykzQEA_pvsrFhhQZXIKFimx4zDFk99Emn-6RegJrT3SCHpYCSZ8UxAffBJVQQY7sNogrYklTuXlHw")
  ALGORITHM: str = "HS256"
  ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours
  ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY", "RNITR9lG104RCgxwv3zK3-p9Xi4tmH59cMYBi03GcFQ=")
  
  # Database
  DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "postgresql://neondb_owner:npg_2cQOu9sTZElj@ep-still-snow-axlrokz2-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require"
  )
  POSTGRES_USER: str = os.getenv("POSTGRES_USER", "algotrade")
  POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "algotrade_pass")
  POSTGRES_DB: str = os.getenv("POSTGRES_DB", "algotrade_db")
  POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "localhost")
  POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
  
  # Redis
  REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
  REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
  
  @property
  def REDIS_URL(self) -> str:
    return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"
  
  # Trading Safety Controls
  LIVE_TRADING: bool = False # PAPER MODE BY DEFAULT
  DEFAULT_DAILY_LOSS_CAP: float = 50000.0

  class Config:
    env_file = ".env"
    extra = "ignore"

settings = Settings()
