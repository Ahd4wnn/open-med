from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.models.user import User
from app.models.patient_profile import PatientProfile
from app.schemas.patient import PatientProfileCreate, PatientProfileOut, PatientProfileUpdate
from app.services.auth_service import get_current_user, require_doctor

router = APIRouter(prefix="/api/patient", tags=["patient"])

@router.post("/profile", response_model=PatientProfileOut)
async def create_profile(
    profile_data: PatientProfileCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(PatientProfile).where(PatientProfile.user_id == current_user.id))
    existing_profile = result.scalars().first()
    if existing_profile:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Profile already exists for this user")
    
    new_profile = PatientProfile(
        user_id=current_user.id,
        **profile_data.model_dump(exclude_unset=True)
    )
    db.add(new_profile)
    await db.commit()
    await db.refresh(new_profile)
    
    return new_profile

@router.get("/profile", response_model=PatientProfileOut)
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(PatientProfile).where(PatientProfile.user_id == current_user.id))
    profile = result.scalars().first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    
    return profile

@router.put("/profile", response_model=PatientProfileOut)
async def update_profile(
    profile_data: PatientProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(PatientProfile).where(PatientProfile.user_id == current_user.id))
    profile = result.scalars().first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    
    update_data = profile_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(profile, key, value)
        
    await db.commit()
    await db.refresh(profile)
    
    return profile

@router.get("/all", response_model=List[dict])
async def get_all_profiles(
    current_user: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(PatientProfile, User.full_name, User.email)
        .join(User, PatientProfile.user_id == User.id)
    )
    result = await db.execute(stmt)
    
    profiles = []
    for profile, full_name, email in result.all():
        profile_dict = PatientProfileOut.model_validate(profile).model_dump()
        profile_dict["full_name"] = full_name
        profile_dict["email"] = email
        profiles.append(profile_dict)
        
    return profiles
