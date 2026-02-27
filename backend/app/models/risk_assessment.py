from sqlalchemy import Column, Integer, Float, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base

class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    patient_profile_id = Column(Integer, ForeignKey("patient_profiles.id"), nullable=True)
    medications_analyzed = Column(Text, nullable=False)
    risk_score = Column(Float, nullable=False)
    risk_category = Column(String(50), nullable=False)
    interaction_count = Column(Integer, default=0)
    breakdown_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    user = relationship("User", back_populates="risk_assessments")
    patient_profile = relationship("PatientProfile", back_populates="risk_assessments")
