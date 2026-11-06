import os
import re
from typing import Any, Dict, Optional
from urllib.parse import urlparse
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# .env is tracked by this repository, so machine-local secrets (broker proxy
# credentials) belong in .env.local, which .gitignore excludes. Real process
# environment variables always take precedence.
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_BASE_DIR, ".env.local"), override=False)

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

  # Angel One static-IP egress proxy (e.g. TrueIP).
  # ANGEL_PROXY_URL must be a full proxy URL, credentials included:
  #   http://username:password@static-ip:port
  # ANGEL_STATIC_IP is the whitelisted egress IP; when omitted it is derived
  # from the proxy host. Never commit these values to source control.
  ANGEL_PROXY_URL: str = os.getenv("ANGEL_PROXY_URL", "")
  ANGEL_STATIC_IP: str = os.getenv("ANGEL_STATIC_IP", "")

  @property
  def angel_proxy_enabled(self) -> bool:
    return bool(self.ANGEL_PROXY_URL.strip())

  @property
  def angel_proxies(self) -> Optional[Dict[str, str]]:
    """requests/SmartConnect proxy mapping, or None when direct egress is used."""
    url = self.ANGEL_PROXY_URL.strip()
    if not url:
      return None
    if "://" not in url:
      url = f"http://{url}"
    return {"http": url, "https": url}

  @property
  def angel_static_ip(self) -> str:
    """The static IP that Angel One must see (and that must be whitelisted)."""
    configured = self.ANGEL_STATIC_IP.strip()
    if configured:
      return configured
    url = self.ANGEL_PROXY_URL.strip()
    if not url:
      return ""
    try:
      return urlparse(url if "://" in url else f"http://{url}").hostname or ""
    except Exception:
      return ""

  @property
  def angel_proxy_host(self) -> str:
    """Proxy host:port without credentials, safe for API responses."""
    url = self.ANGEL_PROXY_URL.strip()
    if not url:
      return ""
    try:
      parsed = urlparse(url if "://" in url else f"http://{url}")
      host = parsed.hostname or ""
      return f"{host}:{parsed.port}" if parsed.port else host
    except Exception:
      return ""

  @property
  def angel_proxy_display(self) -> str:
    """Credential-free proxy description safe for logs."""
    url = self.ANGEL_PROXY_URL.strip()
    if not url:
      return "direct"
    try:
      parsed = urlparse(url if "://" in url else f"http://{url}")
      host = parsed.hostname or "unknown"
      port = f":{parsed.port}" if parsed.port else ""
      user = parsed.username
      auth = f"{user}:***@" if user else ""
      return f"{parsed.scheme or 'http'}://{auth}{host}{port}"
    except Exception:
      return "configured (unparseable)"

  def probe_angel_egress(self, timeout: float = 15.0) -> Dict[str, Any]:
    """
    Verify the egress IP that Angel One actually sees through the proxy.

    Performs a real request through the configured proxy and compares the
    observed address with ANGEL_STATIC_IP. Never returns proxy credentials.
    """
    result: Dict[str, Any] = {
      "enabled": self.angel_proxy_enabled,
      "staticIp": self.angel_static_ip or None,
      "observedIp": None,
      "matchesStaticIp": None,
      "error": None,
    }
    if not self.angel_proxy_enabled:
      return result
    try:
      import requests
      resp = requests.get(
        "https://api.ipify.org",
        timeout=timeout,
        proxies=self.angel_proxies,
      )
      observed = (resp.text or "").strip()
      result["observedIp"] = observed or None
      result["matchesStaticIp"] = bool(observed and observed == self.angel_static_ip)
    except Exception as exc:
      result["error"] = f"{type(exc).__name__}: {str(exc)[:200]}"
    return result

  def apply_angel_proxy_env(self) -> None:
    """
    Export the proxy for libraries that call requests/urllib directly.

    SmartConnect also receives the proxy explicitly, but this covers callbacks
    such as urllib public-IP discovery and the SmartAPI helper GET requests.
    """
    proxies = self.angel_proxies
    if not proxies:
      return
    url = proxies["https"]
    for key in ("HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy"):
      os.environ[key] = url
    # Never proxy loopback traffic.
    os.environ.setdefault("NO_PROXY", "localhost,127.0.0.1,::1")
    os.environ.setdefault("no_proxy", os.environ["NO_PROXY"])

  class Config:
    env_file = ".env"
    extra = "ignore"

settings = Settings()
settings.apply_angel_proxy_env()


def redact_secrets(text: str) -> str:
  """
  Strip proxy/database credentials from error strings before they are logged
  or returned to the frontend.
  """
  if not text:
    return ""
  redacted = re.sub(r"(://[^:/@\s]+:)[^@/\s]+@", r"\1***@", text)
  try:
    password = urlparse(settings.ANGEL_PROXY_URL).password
    if password and len(password) >= 4:
      redacted = redacted.replace(password, "***")
  except Exception:
    pass
  return redacted
