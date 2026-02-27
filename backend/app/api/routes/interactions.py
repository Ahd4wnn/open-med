import json
from typing import List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from pydantic import BaseModel, conlist
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc

from app.database import get_db
from app.models.user import User
from app.models.risk_assessment import RiskAssessment
from app.services.auth_service import get_current_user
from app.services.rxnav_service import search_drug_suggestions
from app.services.openfda_service import search_drug_openfda
from app.services.interaction_service import analyze_drugs
from app.services.food_warning_service import get_food_warnings_for_drugs
import asyncio

router = APIRouter(prefix="/api/interactions", tags=["interactions"])

class AnalyzeDrugsRequest(BaseModel):
    drug_names: List[str]

@router.post("/food-warnings")
async def get_food_warnings(
    body: dict,
    current_user=Depends(get_current_user)
):
    drug_names = body.get("drug_names", [])
    if not drug_names:
        raise HTTPException(
            status_code=400,
            detail="drug_names required"
        )
    result = get_food_warnings_for_drugs(drug_names)
    return result
    drug_names: List[str]

@router.post("/analyze")
async def analyze_drugs_endpoint(
    request: AnalyzeDrugsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if len(request.drug_names) < 2 or len(request.drug_names) > 20:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Provide between 2 and 20 drug names")

    result = await analyze_drugs(request.drug_names)
    
    assessment = RiskAssessment(
        user_id=current_user.id,
        medications_analyzed=json.dumps(result["drugs_analyzed"]),
        risk_score=0.0,
        risk_category="Pending",
        interaction_count=result["total_interactions"],
        breakdown_json=json.dumps(result)
    )
    db.add(assessment)
    await db.commit()
    await db.refresh(assessment)
    
    return {
        "assessment_id": assessment.id,
        **result
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
    
    history = []
    for a in assessments:
        history.append({
            "id": a.id,
            "medications_analyzed": a.medications_analyzed,
            "risk_score": a.risk_score,
            "risk_category": a.risk_category,
            "interaction_count": a.interaction_count,
            "created_at": a.created_at
        })
        
    return history

@router.get("/drugs/search")
async def search_drugs(
    q: str = Query(..., min_length=2),
    current_user=Depends(get_current_user)
):
    from app.services.drug_data import (
        DRUG_ALIASES, DRUG_INTERACTIONS
    )

    rxnorm_results, fda_results = await asyncio.gather(
        search_drug_suggestions(q),
        search_drug_openfda(q)
    )

    local_matches = []
    q_lower = q.lower()
    all_local = set(
        list(DRUG_ALIASES.keys()) +
        [drug for pair in DRUG_INTERACTIONS
         for drug in pair]
    )
    for key in all_local:
        if q_lower in key:
            local_matches.append(key)

    combined = list(dict.fromkeys(
        local_matches + rxnorm_results + fda_results
    ))[:12]

    return {"suggestions": combined}
