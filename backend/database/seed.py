import logging
from sqlalchemy.orm import Session
from backend.database.session import SessionLocal, engine, Base
from backend.database.models import (
    TradingAccountModel,
    AlgorithmModel,
    PositionModel,
    OrderModel,
    AuditLogModel,
    AccountAllocationModel
)
from backend.security.encryption import vault

logger = logging.getLogger(__name__)

def seed_database(db: Session):
    """
    Ensure database tables exist in Neon PostgreSQL.
    No fake/dummy accounts or positions are seeded to ensure 100% clean real-time operation.
    """
    Base.metadata.create_all(bind=engine)
    logger.info("Database schema verified and ready for real trading accounts.")

if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_database(db)
        print("Database schema verified successfully!")
    finally:
        db.close()

