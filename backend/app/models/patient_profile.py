from sqlalchemy import Column, Integer, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base

class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    age = Column(Integer, nullable=True)
    weight_kg = Column(Float, nullable=True)
    egfr = Column(Float, nullable=True)
    liver_score = Column(Integer, nullable=True)
    conditions = Column(Text, nullable=True)
    medications = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    user = relationship("User", back_populates="patient_profile")
    risk_assessments = relationship("RiskAssessment", back_populates="patient_profile")
