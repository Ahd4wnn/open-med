from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.models.user import User
from app.models.patient_profile import PatientProfile
from app.models.risk_assessment import RiskAssessment
from app.schemas.patient import PatientProfileCreate, PatientProfileOut, PatientProfileUpdate
from app.services.auth_service import get_current_user, require_doctor

router = APIRouter(prefix="/api/patient", tags=["patient"])

@router.post("/profile")
async def create_profile(
    body: PatientProfileCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Check if already exists
    existing = await db.execute(
        select(PatientProfile).where(
            PatientProfile.user_id == current_user.id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Profile already exists. Use PUT to update."
        )
    
    profile = PatientProfile(
        user_id=current_user.id,
        age=body.age,
        weight_kg=body.weight_kg,
        egfr=body.egfr,
        liver_score=body.liver_score,
        conditions=body.conditions,
        medications=body.medications
    )
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return profile

@router.put("/profile")
async def update_profile(
    body: PatientProfileUpdate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(PatientProfile).where(
            PatientProfile.user_id == current_user.id
        )
    )
    profile = result.scalar_one_or_none()
    
    # If no profile exists, create one
    if not profile:
        profile = PatientProfile(user_id=current_user.id)
        db.add(profile)
    
    # Update only provided fields
    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)
    
    await db.commit()
    await db.refresh(profile)
    return profile

@router.get("/profile")
async def get_profile(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(PatientProfile).where(
            PatientProfile.user_id == current_user.id
        )
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Profile not found"
        )
    return profile

@router.get("/all")
async def get_all_patients(
    current_user=Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    # Get ALL users with role "patient" — regardless of profile
    users_result = await db.execute(
        select(User).where(User.role == "patient")
    )
    patients = users_result.scalars().all()

    result = []
    for patient in patients:
        # Try to get their profile — it's okay if it doesn't exist
        profile_result = await db.execute(
            select(PatientProfile).where(
                PatientProfile.user_id == patient.id
            )
        )
        profile = profile_result.scalar_one_or_none()

        # Get their latest risk assessment
        assessment_result = await db.execute(
            select(RiskAssessment)
            .where(RiskAssessment.user_id == patient.id)
            .order_by(RiskAssessment.created_at.desc())
            .limit(1)
        )
        latest_assessment = assessment_result.scalar_one_or_none()

        # Count medications from profile if exists
        med_count = 0
        if profile and profile.medications:
            med_count = len([m for m in profile.medications.split(",") 
                           if m.strip()])

        result.append({
            "user_id": patient.id,
            "full_name": patient.full_name,
            "email": patient.email,
            "is_active": patient.is_active,
            "created_at": patient.created_at,
            "has_profile": profile is not None,
            # Profile fields — None if no profile
            "age": profile.age if profile else None,
            "weight_kg": profile.weight_kg if profile else None,
            "egfr": profile.egfr if profile else None,
            "liver_score": profile.liver_score if profile else None,
            "conditions": profile.conditions if profile else None,
            "medications": profile.medications if profile else None,
            "medication_count": med_count,
            "profile_id": profile.id if profile else None,
            # Latest assessment fields — None if no assessment
            "latest_risk_score": latest_assessment.risk_score 
                if latest_assessment else None,
            "latest_risk_category": latest_assessment.risk_category 
                if latest_assessment else None,
            "latest_assessment_date": latest_assessment.created_at 
                if latest_assessment else None,
            "total_assessments": 0
        })

    # Sort: patients with assessments first, then by name
    result.sort(key=lambda x: (
        x["latest_risk_score"] is None,
        -(x["latest_risk_score"] or 0)
    ))

    return result
