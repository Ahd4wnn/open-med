from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.auth_service import get_current_user
from app.models.user import User
from app.models.risk_assessment import RiskAssessment
from app.models.patient_profile import PatientProfile
from app.services.ai_service import generate_cot_risk_explanation, generate_drug_enrichment_summary
from app.services.openfda_service import enrich_drug_list, get_drug_warnings, search_drug_openfda
from app.services.recommendation_service import get_recommendations, get_patient_history_recommendations
import json

router = APIRouter(prefix="/api/ai", tags=["ai"])

@router.post("/explain-direct")
async def explain_direct(
    body: dict,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user)
):
    from app.models.patient_profile import PatientProfile
    from app.services.openai_service import generate_cot_explanation_openai
    from app.services.featherless_service import generate_deep_research_analysis
    import asyncio
    
    drug_names = body.get("drug_names", [])
    interaction_result = body.get("interaction_result", {})
    risk_breakdown = body.get("risk_breakdown", {})
    patient_profile_id = body.get("patient_profile_id")
    
    profile = None
    if patient_profile_id:
        from sqlalchemy.future import select
        result = await db.execute(select(PatientProfile).where(PatientProfile.id == patient_profile_id))
        profile = result.scalars().first()
        
    cot_task = asyncio.create_task(
        generate_cot_explanation_openai(risk_breakdown, interaction_result, profile)
    )
    deep_research_task = asyncio.create_task(
        generate_deep_research_analysis(drug_names, interaction_result)
    )
    
    results = await asyncio.gather(cot_task, deep_research_task, return_exceptions=True)
    
    cot_result = results[0] if not isinstance(results[0], Exception) else {"error": "CoT unavailable", "steps": []}
    deep_research_result = results[1] if not isinstance(results[1], Exception) else {"error": "Research unavailable"}
    
    return {
        "cot_explanation": cot_result,
        "deep_research": deep_research_result,
        "drugs_analyzed": drug_names
    }

@router.post("/explain")
async def explain_assessment(
    body: dict,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy import select
    from app.models.risk_assessment import RiskAssessment
    from app.models.patient_profile import PatientProfile
    from app.services.openai_service import (
        generate_cot_explanation_openai
    )
    import json

    assessment_id = body.get("assessment_id")
    result = await db.execute(
        select(RiskAssessment).where(
            RiskAssessment.id == assessment_id
        )
    )
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404,
                           detail="Assessment not found")
    if (assessment.user_id != current_user.id
            and current_user.role != "doctor"):
        raise HTTPException(status_code=403,
                           detail="Access denied")

    breakdown = json.loads(assessment.breakdown_json)
    medications = json.loads(assessment.medications_analyzed)

    profile_result = await db.execute(
        select(PatientProfile).where(
            PatientProfile.user_id == assessment.user_id
        )
    )
    profile = profile_result.scalar_one_or_none()

    interaction_result = {
        "interactions": breakdown.get("interactions", []),
        "total_interactions": assessment.interaction_count
    }

    try:
        cot = await generate_cot_explanation_openai(
            breakdown, interaction_result, profile
        )
    except Exception as e:
        print(f"Failed OpenAI explanation: {e}")
        cot = await generate_cot_risk_explanation(breakdown, interaction_result, profile)

    return {
        "assessment_id": assessment_id,
        "explanation": cot,
        "medications": medications
    }

@router.post("/drug-info")
async def get_drug_info(
    payload: Dict[str, str],
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    drug_name = payload.get("drug_name")
    if not drug_name:
        raise HTTPException(status_code=400, detail="drug_name required")
        
    enriched_list = await enrich_drug_list([drug_name])
    fda_data = enriched_list[0] if enriched_list else {}
    warnings = await get_drug_warnings(drug_name)
    ai_summary = await generate_drug_enrichment_summary(drug_name, fda_data)
    
    return {
        "drug_name": drug_name,
        "fda_data": fda_data,
        "warnings": warnings,
        "ai_summary": ai_summary
    }

@router.post("/recommendations")
async def get_assessment_recommendations(
    payload: Dict[str, int],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    assessment_id = payload.get("assessment_id")
    if not assessment_id:
        raise HTTPException(status_code=400, detail="assessment_id required")
        
    assessment = db.query(RiskAssessment).filter(RiskAssessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
        
    if assessment.user_id != current_user.id and current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    try:
        breakdown_json = json.loads(assessment.breakdown_json)
        interactions = breakdown_json.get("interactions", [])
        recs = get_recommendations(interactions)
        
        history_patterns = None
        if current_user.role == "patient" or assessment.user_id == current_user.id:
            db_history = db.query(RiskAssessment).filter(RiskAssessment.user_id == assessment.user_id).order_by(RiskAssessment.created_at.desc()).limit(10).all()
            # Reconstruct list of dicts for the service
            history_list = []
            for h in db_history:
                history_list.append({
                    "final_risk_category": h.final_risk_category,
                    "drug_names": h.medications_analyzed
                })
            current_drugs = assessment.medications_analyzed
            history_patterns = get_patient_history_recommendations(history_list, current_drugs)
            
        return {
            "assessment_id": assessment_id,
            "recommendations": recs,
            "history_patterns": history_patterns
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/drug-search-enriched")
async def drug_search_enriched(
    q: str = Query(..., min_length=2),
    current_user=Depends(get_current_user)
):
    from app.services.rxnav_service import search_drug_suggestions
    from app.services.openfda_service import search_drug_openfda
    from app.services.drug_data import DRUG_ALIASES, DRUG_INTERACTIONS

    rxnorm, fda = await asyncio.gather(
        search_drug_suggestions(q),
        search_drug_openfda(q)
    )

    local = []
    q_lower = q.lower()
    for key in set(
        list(DRUG_ALIASES.keys()) +
        [drug for pair in DRUG_INTERACTIONS 
         for drug in pair]
    ):
        if q_lower in key:
            local.append(key)

    combined = list(dict.fromkeys(
        rxnorm + fda + local
    ))[:12]

    return {
        "suggestions": combined,
        "sources": ["RxNorm", "OpenFDA", "OpenMed Database"]
    }
