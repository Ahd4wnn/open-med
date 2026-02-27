from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database import Base

class LifestyleLog(Base):
    __tablename__ = "lifestyle_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    sleep_hours = Column(Float, nullable=True)
    sleep_quality = Column(String(50), nullable=True)
    activity_level = Column(String(50), nullable=True)
    diet_type = Column(String(100), nullable=True)
    alcohol_units_per_week = Column(Float, nullable=True)
    smoking_status = Column(String(50), nullable=True)
    stress_level = Column(Integer, nullable=True)
    food_log = Column(Text, nullable=True)
    water_intake_liters = Column(Float, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    user = relationship("User", back_populates="lifestyle_logs")
