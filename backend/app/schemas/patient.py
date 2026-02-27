from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PatientProfileCreate(BaseModel):
    age: Optional[int] = None
    weight_kg: Optional[float] = None
    egfr: Optional[float] = None
    liver_score: Optional[int] = None
    conditions: Optional[str] = None
    medications: Optional[str] = None

class PatientProfileOut(BaseModel):
    id: int
    user_id: int
    age: Optional[int]
    weight_kg: Optional[float]
    egfr: Optional[float]
    liver_score: Optional[int]
    conditions: Optional[str]
    medications: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class PatientProfileUpdate(BaseModel):
    age: Optional[int] = None
    weight_kg: Optional[float] = None
    egfr: Optional[float] = None
    liver_score: Optional[int] = None
    conditions: Optional[str] = None
    medications: Optional[str] = None
