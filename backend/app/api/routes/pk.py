from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.services.auth_service import get_current_user
from app.models.user import User
from app.models.patient_profile import PatientProfile
from app.services.pk_data import PK_DRUG_DATA
from app.services.pk_service import simulate_full_regimen

router = APIRouter(prefix="/api/pk", tags=["pharmacokinetics"])

class SimulateRequest(BaseModel):
    drug_names: List[str]
    doses: Optional[Dict[str, float]] = None
    patient_profile_id: Optional[int] = None

@router.options("/simulate")
async def simulate_pk_options():
    return {}

@router.post("/simulate")
async def simulate_pk(
    payload: SimulateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not payload.drug_names or len(payload.drug_names) > 15:
        raise HTTPException(
            status_code=400, 
            detail="Must provide between 1 and 15 drug names to simulate."
        )
        
    normalized_names = [d.lower().strip() for d in payload.drug_names]
    doses = payload.doses or {}
    
    profile = None
    if payload.patient_profile_id and current_user.role == "doctor":
        result = await db.execute(select(PatientProfile).where(PatientProfile.id == payload.patient_profile_id))
        profile = result.scalars().first()
    else:
        result = await db.execute(select(PatientProfile).where(PatientProfile.user_id == current_user.id))
        profile = result.scalars().first()
        
    result = simulate_full_regimen(normalized_names, doses, profile)
    return result

@router.get("/drug/{drug_name}")
async def get_pk_drug_info(
    drug_name: str,
    current_user: User = Depends(get_current_user)
):
    normalized = drug_name.lower().strip()
    if normalized in PK_DRUG_DATA:
        return PK_DRUG_DATA[normalized]
    
    return {"error": "No PK data available", "drug_name": drug_name}

@router.get("/supported-drugs")
async def get_supported_pk_drugs(
    current_user: User = Depends(get_current_user)
):
    drugs = list(PK_DRUG_DATA.keys())
    return {
        "drugs": sorted(drugs),
        "count": len(drugs)
    }
