import ssl
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from backend.config import settings

database_url = settings.DATABASE_URL
connect_args = {}

if "postgresql" in database_url:
  if not database_url.startswith("postgresql+"):
    database_url = database_url.replace("postgresql://", "postgresql+pg8000://", 1)
  if "sslmode=" in database_url:
    database_url = database_url.split("?")[0]
  ctx = ssl.create_default_context()
  connect_args["ssl_context"] = ctx
elif "sqlite" in database_url:
  connect_args["check_same_thread"] = False

engine = create_engine(
  database_url,
  connect_args=connect_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
  db = SessionLocal()
  try:
    yield db
  finally:
    db.close()
