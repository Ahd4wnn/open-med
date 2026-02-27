import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, func

from app.database import get_db
from app.models.user import User
from app.models.patient_profile import PatientProfile
from app.models.risk_assessment import RiskAssessment
from app.schemas.risk import RiskAssessRequest, RiskAssessmentOut
from app.services.auth_service import get_current_user, require_doctor
from app.services.interaction_service import analyze_drugs
from app.services.risk_service import compute_risk_score, get_risk_label_color
from app.services.recommendation_service import get_recommendations

router = APIRouter(prefix="/api/risk", tags=["risk"])

@router.post("/assess")
async def assess_risk(
    request: RiskAssessRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if len(request.drug_names) < 2 or len(request.drug_names) > 20:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Provide between 2 and 20 drug names")

    interaction_result = await analyze_drugs(request.drug_names)
    
    patient_profile = None
    if current_user.role == "doctor" and request.patient_profile_id is not None:
        result = await db.execute(select(PatientProfile).where(PatientProfile.id == request.patient_profile_id))
        patient_profile = result.scalars().first()
        if not patient_profile:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient profile not found")
    elif current_user.role == "patient":
        result = await db.execute(select(PatientProfile).where(PatientProfile.user_id == current_user.id))
        patient_profile = result.scalars().first()

    breakdown = compute_risk_score(interaction_result, patient_profile)
    
    assessment = RiskAssessment(
        user_id=current_user.id,
        patient_profile_id=patient_profile.id if patient_profile else None,
        medications_analyzed=json.dumps(request.drug_names),
        risk_score=breakdown["final_score"],
        risk_category=breakdown["risk_category"],
        interaction_count=interaction_result["total_interactions"],
        breakdown_json=json.dumps(breakdown)
    )
    
    db.add(assessment)
    await db.commit()
    await db.refresh(assessment)
    
    recommendations = get_recommendations(interaction_result.get("interactions", []))
    
    return {
        "assessment_id": assessment.id,
        "interaction_analysis": interaction_result,
        "risk_assessment": breakdown,
        "label_color": get_risk_label_color(breakdown["risk_category"]),
        "recommendations": recommendations,
        "has_recommendations": len(recommendations) > 0
    }

@router.get("/history")
async def get_assessment_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(RiskAssessment)
        .where(RiskAssessment.user_id == current_user.id)
        .order_by(desc(RiskAssessment.created_at))
        .limit(10)
    )
    result = await db.execute(stmt)
    assessments = result.scalars().all()
    
    history_out = []
    for a in assessments:
        breakdown_dict = {}
        drugs_list = []
        try:
            breakdown_dict = json.loads(a.breakdown_json)
            drugs_list = json.loads(a.medications_analyzed)
        except Exception:
            pass

        history_out.append({
            "id": a.id,
            "drug_names": drugs_list,
            "medications_analyzed": drugs_list,
            "risk_score": a.risk_score,
            "risk_category": a.risk_category,
            "interaction_count": a.interaction_count,
            "label_color": get_risk_label_color(a.risk_category),
            "created_at": a.created_at,
            "breakdown": breakdown_dict
        })
        
    return history_out

@router.get("/assess/{assessment_id}")
async def get_assessment(
    assessment_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(RiskAssessment).where(RiskAssessment.id == assessment_id))
    assessment = result.scalars().first()
    
    if not assessment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")
        
    if assessment.user_id != current_user.id and current_user.role != "doctor":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view this assessment")

    breakdown_dict = {}
    recommendations = []
    try:
        breakdown_dict = json.loads(assessment.breakdown_json)
        interactions = breakdown_dict.get("interactions", [])
        recommendations = get_recommendations(interactions)
    except Exception:
        pass
        
    return {
        **RiskAssessmentOut.model_validate(assessment).model_dump(),
        "breakdown": breakdown_dict,
        "drug_names": json.loads(assessment.medications_analyzed),
        "medications_analyzed": json.loads(assessment.medications_analyzed),
        "label_color": get_risk_label_color(assessment.risk_category),
        "recommendations": recommendations,
        "has_recommendations": len(recommendations) > 0
    }

@router.get("/doctor/patients/summary")
async def get_patients_summary(
    current_user: User = Depends(require_doctor),
    db: AsyncSession = Depends(get_db)
):
    # Window function to get the latest assessment for each user
    subq = (
        select(
            RiskAssessment.user_id,
            func.max(RiskAssessment.created_at).label("max_date")
        )
        .group_by(RiskAssessment.user_id)
        .subquery()
    )

    stmt = (
        select(User, PatientProfile, RiskAssessment)
        .join(PatientProfile, User.id == PatientProfile.user_id, isouter=True)
        .join(RiskAssessment, User.id == RiskAssessment.user_id, isouter=True)
        .join(subq, (RiskAssessment.user_id == subq.c.user_id) & (RiskAssessment.created_at == subq.c.max_date))
        .where(User.role == "patient")
    )
    
    result = await db.execute(stmt)
    
    summary = []
    seen_users = set()
    
    for row in result.all():
        user = row[0]
        if user.id in seen_users:
            continue
        seen_users.add(user.id)
            
        assessment = row[2]
        meds_count = 0
        if assessment:
            try:
                meds_count = len(json.loads(assessment.medications_analyzed))
            except Exception:
                pass

        if assessment:
            summary.append({
                "patient_id": user.id,
                "patient_name": user.full_name,
                "patient_email": user.email,
                "latest_risk_score": assessment.risk_score,
                "latest_risk_category": assessment.risk_category,
                "label_color": get_risk_label_color(assessment.risk_category),
                "medication_count": meds_count,
                "assessment_date": assessment.created_at
            })
            
    summary.sort(key=lambda x: x["latest_risk_score"], reverse=True)
    return summary
