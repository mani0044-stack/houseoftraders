import logging
import os
import socket
import ssl
from typing import Dict, List
from urllib.parse import urlsplit

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool
from backend.config import settings

logger = logging.getLogger("algotrade")

_ORIGINAL_GETADDRINFO = socket.getaddrinfo


def _resolve_via_doh(host: str, timeout: float = 8.0) -> List[str]:
  """
  Resolve A records through DNS-over-HTTPS (Cloudflare) when the local/ISP
  resolver refuses the hostname.

  Some ISP/router resolvers refuse queries for cloud database endpoints
  (e.g. *.aws.neon.tech), which makes the backend unable to boot even though
  the database itself is online. DoH is queried by IP and bypasses the OS
  resolver entirely.
  """
  import requests

  session = requests.Session()
  # DNS lookups must never be routed through the Angel One broker proxy.
  session.trust_env = False
  response = session.get(
    "https://1.1.1.1/dns-query",
    params={"name": host, "type": "A"},
    headers={"accept": "application/dns-json"},
    timeout=timeout,
  )
  response.raise_for_status()
  return [
    answer["data"]
    for answer in response.json().get("Answer", [])
    if answer.get("type") == 1
  ]


def _install_dns_fallback(host: str) -> None:
  """Patch getaddrinfo for a single host when the system resolver fails."""
  if not host:
    return

  try:
    _ORIGINAL_GETADDRINFO(host, 5432, type=socket.SOCK_STREAM)
    return
  except socket.gaierror:
    pass
  except Exception:
    return

  try:
    addresses = _resolve_via_doh(host)
  except Exception as exc:
    logger.error("DNS fallback failed for %s: %s", host, exc)
    return

  if not addresses:
    logger.error("DNS-over-HTTPS returned no A records for %s", host)
    return

  logger.warning(
    "System DNS could not resolve %s; using DNS-over-HTTPS result %s",
    host,
    ", ".join(addresses),
  )

  def _patched_getaddrinfo(node, port, family=0, type=0, proto=0, flags=0):
    if node == host:
      socktype = type or socket.SOCK_STREAM
      return [
        (socket.AF_INET, socktype, socket.IPPROTO_TCP, "", (address, port))
        for address in addresses
      ]
    return _ORIGINAL_GETADDRINFO(node, port, family, type, proto, flags)

  socket.getaddrinfo = _patched_getaddrinfo


database_url = settings.DATABASE_URL
connect_args: Dict[str, object] = {}

if "postgresql" in database_url:
  if not database_url.startswith("postgresql+"):
    database_url = database_url.replace("postgresql://", "postgresql+pg8000://", 1)
  if "sslmode=" in database_url:
    database_url = database_url.split("?")[0]

  db_host = urlsplit(database_url.replace("postgresql+pg8000://", "postgresql://", 1)).hostname
  _install_dns_fallback(db_host or "")

  ctx = ssl.create_default_context()
  connect_args["ssl_context"] = ctx
elif "sqlite" in database_url:
  connect_args["check_same_thread"] = False

engine_kwargs = {
  "connect_args": connect_args,
  # Neon closes idle connections; validate before handing one to a request.
  "pool_pre_ping": True,
  "pool_recycle": 300,
}
if os.getenv("VERCEL"):
  # Serverless functions are frozen between requests, so pooled connections go
  # stale and cause intermittent 500s. Open a fresh connection per invocation.
  engine_kwargs["poolclass"] = NullPool

engine = create_engine(database_url, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
  db = SessionLocal()
  try:
    yield db
  finally:
    db.close()
