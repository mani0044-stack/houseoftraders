"""
Per-account static-IP egress configuration for Angel One SmartAPI.

Each trading account may have its own static-IP proxy (different provider
username/password/static IP). Accounts without an explicit proxy fall back to
the server-wide ``ANGEL_PROXY_URL`` / ``ANGEL_STATIC_IP`` settings, and finally
to direct egress.
"""
from typing import Any, Dict, Optional
from urllib.parse import urlparse

from backend.config import settings, redact_secrets


def normalize_proxy_url(proxy_url: str) -> str:
  """Return a full proxy URL (adds http:// when the scheme is missing)."""
  url = (proxy_url or "").strip()
  if not url:
    return ""
  if "://" not in url:
    url = f"http://{url}"
  return url


def proxy_mapping(proxy_url: str) -> Optional[Dict[str, str]]:
  """requests/SmartConnect proxy mapping, or None when no proxy is set."""
  url = normalize_proxy_url(proxy_url)
  if not url:
    return None
  return {"http": url, "https": url}


def proxy_host(proxy_url: str) -> str:
  """Proxy host:port without credentials, safe for logs and API responses."""
  url = normalize_proxy_url(proxy_url)
  if not url:
    return ""
  try:
    parsed = urlparse(url)
  except Exception:
    return ""
  host = parsed.hostname or ""
  if not host:
    return ""
  return f"{host}:{parsed.port}" if parsed.port else host


def proxy_display(proxy_url: str) -> str:
  """Credential-free proxy description for logs (no username or password)."""
  url = normalize_proxy_url(proxy_url)
  if not url:
    return "direct"
  try:
    parsed = urlparse(url)
    host = parsed.hostname or "unknown"
    port = f":{parsed.port}" if parsed.port else ""
    return f"{parsed.scheme or 'http'}://{host}{port}"
  except Exception:
    return "configured (unparseable)"


def static_ip_for(proxy_url: str, static_ip: str = "") -> str:
  """Effective static IP: explicit value first, then the proxy host itself."""
  configured = (static_ip or "").strip()
  if configured:
    return configured
  url = normalize_proxy_url(proxy_url)
  if not url:
    return ""
  try:
    return urlparse(url).hostname or ""
  except Exception:
    return ""


def account_proxy_config(proxy_url: str, static_ip: str = "") -> Dict[str, Any]:
  """
  Resolve the effective egress proxy for one account.

  Priority: account-specific proxy -> server-wide proxy -> direct.
  """
  url = normalize_proxy_url(proxy_url)
  if url:
    return {
      "source": "account",
      "enabled": True,
      "proxies": proxy_mapping(url) or {},
      "proxyHost": proxy_host(url),
      "staticIp": static_ip_for(url, static_ip),
      "display": proxy_display(url),
    }

  global_proxies = settings.angel_proxies or {}
  has_global = bool(global_proxies)
  if has_global:
    return {
      "source": "server",
      "enabled": True,
      "proxies": global_proxies,
      "proxyHost": settings.angel_proxy_host,
      "staticIp": settings.angel_static_ip,
      "display": settings.angel_proxy_display,
    }

  # No proxy on this account or the server. An explicitly configured static IP
  # still describes the egress identity (e.g. the host has a network-level
  # static IP), so keep it for the clientPublicIP header and diagnostics.
  explicit_ip = (static_ip or "").strip()
  return {
    "source": "account-static-ip" if explicit_ip else "direct",
    "enabled": False,
    "proxies": {},
    "proxyHost": "",
    "staticIp": explicit_ip,
    "display": "direct",
  }


def probe_proxy_egress(
  proxies: Optional[Dict[str, str]],
  expected_ip: str = "",
  timeout: float = 15.0,
) -> Dict[str, Any]:
  """Make one real proxied request and report the observed egress IP."""
  result: Dict[str, Any] = {
    "observedIp": None,
    "matchesStaticIp": None,
    "error": None,
  }
  if not proxies:
    result["error"] = "No proxy configured; traffic egresses directly."
    return result
  try:
    import requests

    response = requests.get(
      "https://api.ipify.org",
      timeout=timeout,
      proxies=proxies,
    )
    observed = (response.text or "").strip()
    result["observedIp"] = observed or None
    result["matchesStaticIp"] = bool(
      observed and expected_ip and observed == expected_ip
    )
  except Exception as exc:
    result["error"] = redact_secrets(f"{type(exc).__name__}: {str(exc)[:200]}")
  return result
