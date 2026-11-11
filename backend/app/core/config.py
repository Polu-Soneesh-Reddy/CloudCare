from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = 'postgresql://cloudcare:cloudcare@localhost:5432/cloudcare'
    SECRET_KEY: str = 'changeme-in-production-use-env-var'
    ALGORITHM: str = 'HS256'
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    CORS_ORIGINS: str = 'http://localhost:5173,http://localhost:80,http://localhost:3000'
    DEMO_EMAIL: str = 'admin@cloudcare.demo'
    DEMO_PASSWORD: str = 'demo1234'
    APP_VERSION: str = '1.0.0'

    class Config:
        env_file = '.env'
        extra = 'ignore'

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(',') if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
