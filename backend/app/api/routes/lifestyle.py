import json
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.services.auth_service import get_current_user
from app.models.user import User
from app.models.lifestyle import LifestyleLog
from app.models.patient_profile import PatientProfile
from app.schemas.lifestyle import LifestyleLogCreate, LifestyleLogOut, LifestyleLogUpdate
from app.services.lifestyle_service import run_multi_agent_pipeline

router = APIRouter(prefix="/api/lifestyle", tags=["lifestyle"])

class AnalyzeRequest(BaseModel):
    drug_names: List[str]
    patient_profile_id: Optional[int] = None
    patient_user_id: Optional[int] = None

@router.post("/log", response_model=LifestyleLogOut)
async def create_lifestyle_log(
    payload: LifestyleLogCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    food_log_str = json.dumps(payload.food_log) if payload.food_log else None
    
    log = LifestyleLog(
        user_id=current_user.id,
        sleep_hours=payload.sleep_hours,
        sleep_quality=payload.sleep_quality,
        activity_level=payload.activity_level,
        diet_type=payload.diet_type,
        alcohol_units_per_week=payload.alcohol_units_per_week,
        smoking_status=payload.smoking_status,
        stress_level=payload.stress_level,
        water_intake_liters=payload.water_intake_liters,
        food_log=food_log_str
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return log

@router.get("/log", response_model=Optional[LifestyleLogOut])
async def get_latest_lifestyle_log(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(LifestyleLog)
        .where(LifestyleLog.user_id == current_user.id)
        .order_by(LifestyleLog.created_at.desc())
        .limit(1)
    )
    log = result.scalars().first()
    return log

@router.put("/log", response_model=LifestyleLogOut)
async def update_lifestyle_log(
    payload: LifestyleLogUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(LifestyleLog)
        .where(LifestyleLog.user_id == current_user.id)
        .order_by(LifestyleLog.created_at.desc())
        .limit(1)
    )
    log = result.scalars().first()
    
    if not log:
        # Create instead
        return await create_lifestyle_log(payload, db, current_user)
        
    log.sleep_hours = payload.sleep_hours
    log.sleep_quality = payload.sleep_quality
    log.activity_level = payload.activity_level
    log.diet_type = payload.diet_type
    log.alcohol_units_per_week = payload.alcohol_units_per_week
    log.smoking_status = payload.smoking_status
    log.stress_level = payload.stress_level
    log.water_intake_liters = payload.water_intake_liters
    log.food_log = json.dumps(payload.food_log) if payload.food_log is not None else log.food_log
    
    await db.commit()
    await db.refresh(log)
    return log

@router.post("/analyze")
async def analyze_lifestyle(
    payload: AnalyzeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not payload.drug_names or len(payload.drug_names) > 20:
        raise HTTPException(status_code=400, detail="Must provide between 1 and 20 drug names.")

    profile = None
    target_user_id = current_user.id

    if payload.patient_user_id and current_user.role == "doctor":
        target_user_id = payload.patient_user_id
        if payload.patient_profile_id:
            prof_res = await db.execute(select(PatientProfile).where(PatientProfile.id == payload.patient_profile_id))
            profile = prof_res.scalars().first()
    elif payload.patient_profile_id and current_user.role == "doctor":
        prof_res = await db.execute(select(PatientProfile).where(PatientProfile.id == payload.patient_profile_id))
        profile = prof_res.scalars().first()
        if profile:
            target_user_id = profile.user_id
    elif not payload.patient_profile_id and current_user.role == "patient":
        prof_res = await db.execute(select(PatientProfile).where(PatientProfile.user_id == current_user.id))
        profile = prof_res.scalars().first()

    result = await db.execute(
        select(LifestyleLog)
        .where(LifestyleLog.user_id == target_user_id)
        .order_by(LifestyleLog.created_at.desc())
        .limit(1)
    )
    log = result.scalars().first()
    
    if not log:
        raise HTTPException(status_code=400, detail="No lifestyle log found for this patient. Please ask them to log their lifestyle data first.")
        
    pipeline_result = await run_multi_agent_pipeline(
        user_id=target_user_id,
        lifestyle_log=log,
        patient_profile=profile,
        drug_names=payload.drug_names,
        db=db
    )
    
    return pipeline_result

@router.get("/history", response_model=List[LifestyleLogOut])
async def get_lifestyle_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(LifestyleLog)
        .where(LifestyleLog.user_id == current_user.id)
        .order_by(LifestyleLog.created_at.desc())
        .limit(5)
    )
    return list(result.scalars().all())
