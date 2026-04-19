"""SQLAlchemy 2.0 ORM models for all 7 database tables."""

from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Date,
    Text, ForeignKey, UniqueConstraint, Index, func,
)
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class UserAccount(Base):
    __tablename__ = "user_accounts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String, nullable=False, unique=True, default="default")
    initial_capital = Column(Float, nullable=False, default=1_000_000)
    current_cash = Column(Float, nullable=False, default=1_000_000)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    positions = relationship("Position", back_populates="user", cascade="all, delete-orphan")
    trades = relationship("TradeRecord", back_populates="user", cascade="all, delete-orphan")
    snapshots = relationship("AssetSnapshot", back_populates="user", cascade="all, delete-orphan")


class Position(Base):
    __tablename__ = "positions"
    __table_args__ = (
        UniqueConstraint("user_id", "stock_id", name="uq_position_user_stock"),
        Index("idx_positions_user", "user_id"),
        Index("idx_positions_stock", "stock_id"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user_accounts.id"), nullable=False)
    stock_id = Column(String, nullable=False)
    stock_name = Column(String, nullable=False)
    shares = Column(Integer, nullable=False, default=0)
    avg_cost = Column(Float, nullable=False, default=0)
    total_cost = Column(Float, nullable=False, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("UserAccount", back_populates="positions")


class TradeRecord(Base):
    __tablename__ = "trade_records"
    __table_args__ = (
        Index("idx_trades_user", "user_id"),
        Index("idx_trades_stock", "stock_id"),
        Index("idx_trades_date", "traded_at"),
        Index("idx_trades_type", "trade_type"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user_accounts.id"), nullable=False)
    stock_id = Column(String, nullable=False)
    stock_name = Column(String, nullable=False)
    trade_type = Column(String, nullable=False)  # 'buy' | 'sell'
    shares = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)
    amount = Column(Float, nullable=False)
    fee = Column(Float, nullable=False, default=0)
    tax = Column(Float, nullable=False, default=0)
    net_amount = Column(Float, nullable=False)
    realized_pnl = Column(Float, nullable=True)
    traded_at = Column(DateTime, server_default=func.now())

    user = relationship("UserAccount", back_populates="trades")


class PredictionRecord(Base):
    __tablename__ = "prediction_records"
    __table_args__ = (
        Index("idx_predictions_stock", "stock_id"),
        Index("idx_predictions_status", "status"),
        Index("idx_predictions_date", "predicted_at"),
        Index("idx_predictions_correct", "is_correct"),
        Index("idx_predictions_ai", "ai_involved"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    stock_id = Column(String, nullable=False)
    stock_name = Column(String, nullable=False)
    predicted_at = Column(DateTime, nullable=False, server_default=func.now())
    predicted_direction = Column(String, nullable=False)  # 'up' | 'down' | 'flat'
    predicted_confidence = Column(Float, nullable=False)
    price_at_prediction = Column(Float, nullable=False)
    signal_score = Column(Float, nullable=True)
    ai_involved = Column(Boolean, nullable=False, default=False)
    horizon = Column(String, nullable=False, default="1w")  # '1d' | '3d' | '1w' | '2w' | '1mo'
    verify_after = Column(DateTime, nullable=True)  # When to verify (predicted_at + horizon duration)
    verify_at = Column(DateTime, nullable=True)
    price_at_verify = Column(Float, nullable=True)
    actual_direction = Column(String, nullable=True)
    price_change_pct = Column(Float, nullable=True)
    status = Column(String, nullable=False, default="pending")  # 'pending' | 'verified' | 'expired'
    is_correct = Column(Boolean, nullable=True)


class AssetSnapshot(Base):
    __tablename__ = "asset_snapshots"
    __table_args__ = (
        UniqueConstraint("user_id", "snapshot_date", name="uq_snapshot_user_date"),
        Index("idx_snapshots_user_date", "user_id", "snapshot_date"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user_accounts.id"), nullable=False)
    snapshot_date = Column(Date, nullable=False)
    cash = Column(Float, nullable=False)
    stock_value = Column(Float, nullable=False)
    total_assets = Column(Float, nullable=False)
    daily_pnl = Column(Float, nullable=False, default=0)
    daily_pnl_pct = Column(Float, nullable=False, default=0)
    total_pnl = Column(Float, nullable=False, default=0)
    total_pnl_pct = Column(Float, nullable=False, default=0)
    positions_detail = Column(Text, nullable=True)  # JSON string
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("UserAccount", back_populates="snapshots")


class StockDailyData(Base):
    __tablename__ = "stock_daily_data"
    __table_args__ = (
        UniqueConstraint("stock_id", "trade_date", name="uq_daily_stock_date"),
        Index("idx_daily_stock", "stock_id"),
        Index("idx_daily_date", "trade_date"),
        Index("idx_daily_stock_date", "stock_id", "trade_date"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    stock_id = Column(String, nullable=False)
    trade_date = Column(Date, nullable=False)
    open_price = Column(Float, nullable=True)
    high_price = Column(Float, nullable=True)
    low_price = Column(Float, nullable=True)
    close_price = Column(Float, nullable=True)
    volume = Column(Integer, nullable=True)
    turnover = Column(Float, nullable=True)
    change_price = Column(Float, nullable=True)
    change_pct = Column(Float, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class AppSetting(Base):
    __tablename__ = "app_settings"

    key = Column(String, primary_key=True)
    value = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
