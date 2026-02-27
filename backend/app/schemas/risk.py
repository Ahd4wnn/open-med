from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

class RiskAssessRequest(BaseModel):
    drug_names: List[str]
    patient_profile_id: Optional[int] = None

class RiskAssessmentOut(BaseModel):
    id: int
    user_id: int
    medications_analyzed: List[str]
    risk_score: float
    risk_category: str
    interaction_count: int
    created_at: datetime
    breakdown: Optional[Dict[str, Any]] = None

    model_config = {"from_attributes": True}
