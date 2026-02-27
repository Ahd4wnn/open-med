import json
from pydantic import BaseModel, Field, model_validator
from typing import Optional, List, Any
from datetime import datetime

class LifestyleLogBase(BaseModel):
    sleep_hours: Optional[float] = Field(None, ge=0, le=24)
    sleep_quality: Optional[str] = None # "poor" | "fair" | "good" | "excellent"
    activity_level: Optional[str] = None # "sedentary" | "light" | "moderate" | "active" | "very_active"
    diet_type: Optional[str] = None
    alcohol_units_per_week: Optional[float] = None
    smoking_status: Optional[str] = None # "never" | "former" | "current"
    stress_level: Optional[int] = Field(None, ge=1, le=10)
    water_intake_liters: Optional[float] = None

class LifestyleLogCreate(LifestyleLogBase):
    food_log: Optional[List[str]] = Field(None, max_length=50)

class LifestyleLogUpdate(LifestyleLogCreate):
    pass

class LifestyleLogOut(LifestyleLogBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    food_log: Optional[List[str]] = None

    model_config = {
        "from_attributes": True
    }

    @model_validator(mode='before')
    @classmethod
    def parse_food_log(cls, data: Any) -> Any:
        # If it's an ORM model
        if hasattr(data, "food_log"):
            if isinstance(data.food_log, str):
                try:
                    setattr(data, "food_log", json.loads(data.food_log))
                except json.JSONDecodeError:
                    setattr(data, "food_log", [])
        # If it's a dict
        elif isinstance(data, dict) and "food_log" in data:
            if isinstance(data["food_log"], str):
                try:
                    data["food_log"] = json.loads(data["food_log"])
                except json.JSONDecodeError:
                    data["food_log"] = []
        return data
