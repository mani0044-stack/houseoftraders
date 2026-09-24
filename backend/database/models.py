from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database.session import Base

class UserModel(Base):
  __tablename__ = "users"

  id = Column(String, primary_key=True, index=True)
  email = Column(String, unique=True, index=True, nullable=False)
  hashed_password = Column(String, nullable=False)
  is_active = Column(Boolean, default=True)
  created_at = Column(DateTime, default=datetime.utcnow)

class TradingAccountModel(Base):
  __tablename__ = "trading_accounts"

  id = Column(String, primary_key=True, index=True)
  name = Column(String, nullable=False)
  client_id = Column(String, nullable=False) # e.g. "ANGEL-****89"
  broker = Column(String, default="Angel One")
  status = Column(String, default="Connected") # Connected, Disconnected, Authentication_Required, Rate_Limited
  available_margin = Column(Float, default=500000.0)
  used_margin = Column(Float, default=0.0)
  total_capital = Column(Float, default=500000.0)
  todays_pnl = Column(Float, default=0.0)
  open_positions_count = Column(Integer, default=0)
  assigned_algos_count = Column(Integer, default=0)
  last_heartbeat = Column(String, default="Just now")
  is_enabled = Column(Boolean, default=True)
  
  # Encrypted secrets in vault
  encrypted_api_key = Column(String, nullable=True)
  encrypted_api_secret = Column(String, nullable=True)
  encrypted_pin = Column(String, nullable=True)
  encrypted_totp_secret = Column(String, nullable=True)

  created_at = Column(DateTime, default=datetime.utcnow)

class AlgorithmModel(Base):
  __tablename__ = "algorithms"

  id = Column(String, primary_key=True, index=True)
  name = Column(String, nullable=False)
  description = Column(Text, nullable=True)
  underlying = Column(String, default="NIFTY")
  strategy_type = Column(String, default="Custom Algorithmic")
  status = Column(String, default="Active") # Active, Stopped, Paused
  mode = Column(String, default="Paper") # Paper, Live
  trades_today = Column(Integer, default=0)
  todays_pnl = Column(Float, default=0.0)
  max_daily_loss = Column(Float, default=15000.0)
  current_exposure = Column(Float, default=0.0)
  max_trades_per_day = Column(Integer, default=10)
  max_open_positions = Column(Integer, default=2)
  
  expiry_type = Column(String, default="Nearest")
  strike_selection = Column(String, default="ATM")
  option_type = Column(String, default="Auto")
  
  entry_conditions = Column(JSON, nullable=True)
  exit_conditions = Column(JSON, nullable=True)
  position_sizing = Column(JSON, nullable=True)
  
  created_at = Column(DateTime, default=datetime.utcnow)

class AccountAllocationModel(Base):
  __tablename__ = "account_allocations"

  id = Column(String, primary_key=True, index=True)
  algo_id = Column(String, ForeignKey("algorithms.id"), nullable=False)
  account_id = Column(String, ForeignKey("trading_accounts.id"), nullable=False)
  is_enabled = Column(Boolean, default=True)
  lots_multiplier = Column(Integer, default=1)

class PositionModel(Base):
  __tablename__ = "positions"

  id = Column(String, primary_key=True, index=True)
  account_id = Column(String, nullable=False)
  account_name = Column(String, nullable=False)
  symbol = Column(String, nullable=False)
  underlying = Column(String, nullable=False)
  expiry = Column(String, nullable=False)
  strike = Column(Float, nullable=False)
  type = Column(String, nullable=False) # CE, PE
  quantity = Column(Integer, nullable=False)
  average_price = Column(Float, nullable=False)
  ltp = Column(Float, nullable=False)
  unrealized_pnl = Column(Float, default=0.0)
  pnl_percent = Column(Float, default=0.0)
  realized_pnl = Column(Float, default=0.0)
  algo_id = Column(String, nullable=False)
  algo_name = Column(String, nullable=False)
  status = Column(String, default="OPEN") # OPEN, CLOSED
  entry_time = Column(String, nullable=False)

class OrderModel(Base):
  __tablename__ = "orders"

  id = Column(String, primary_key=True, index=True)
  idempotency_key = Column(String, unique=True, index=True, nullable=True) # strategy_id + account_id + signal_id
  broker_order_id = Column(String, nullable=False)
  timestamp = Column(String, nullable=False)
  account_id = Column(String, nullable=False)
  account_name = Column(String, nullable=False)
  algo_id = Column(String, nullable=False)
  algo_name = Column(String, nullable=False)
  symbol = Column(String, nullable=False)
  side = Column(String, nullable=False) # BUY, SELL
  quantity = Column(Integer, nullable=False)
  order_type = Column(String, default="MARKET")
  price = Column(Float, nullable=False)
  average_price = Column(Float, nullable=True)
  status = Column(String, default="COMPLETED") # OPEN, COMPLETED, CANCELLED, REJECTED
  rejection_reason = Column(String, nullable=True)
  timeline = Column(JSON, nullable=True)

class AuditLogModel(Base):
  __tablename__ = "audit_logs"

  id = Column(String, primary_key=True, index=True)
  timestamp = Column(String, nullable=False)
  category = Column(String, nullable=False)
  severity = Column(String, nullable=False) # INFO, SUCCESS, WARNING, ERROR
  title = Column(String, nullable=False)
  message = Column(Text, nullable=False)
