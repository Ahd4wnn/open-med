from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.api.dependencies import get_current_user, get_db
from app.models.user import User
from app.models.risk_assessment import RiskAssessment
from app.models.patient_profile import PatientProfile
from app.services.ai_service import generate_cot_risk_explanation, generate_drug_enrichment_summary
from app.services.openfda_service import enrich_drug_list, get_drug_warnings, search_drug_openfda
from app.services.recommendation_service import get_recommendations, get_patient_history_recommendations
from app.services.risk_service import get_history
import json

router = APIRouter(prefix="/api/ai", tags=["ai"])

@router.post("/explain")
async def explain_assessment(
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
        # Reconstruct the expected dicts from the stored JSON
        breakdown_json = json.loads(assessment.breakdown_json)
        meds = assessment.medications_analyzed
        
        # Build interaction result
        interaction_result = {
            "final_risk_score": assessment.final_risk_score,
            "final_risk_category": assessment.final_risk_category,
            "interactions": breakdown_json.get("interactions", []),
            "clinical_flags": breakdown_json.get("clinical_flags", [])
        }
        
        # Build risk breakdown
        risk_breakdown = {
            "total_medications": len(meds) if meds else 0,
            "final_score": assessment.final_risk_score
        }
        
        # Fetch patient profile
        profile = None
        if current_user.role == "patient":
            profile = db.query(PatientProfile).filter(PatientProfile.user_id == current_user.id).first()
            
        cot_result = await generate_cot_risk_explanation(risk_breakdown, interaction_result, profile)
        cot_result["assessment_id"] = assessment_id
        return cot_result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
            db_history = get_history(db, assessment.user_id)
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
    q: str,
    current_user: User = Depends(get_current_user)
) -> Dict[str, List[str]]:
    if len(q) < 2:
        return {"suggestions": []}
        
    try:
        # Import rxnav service locally to avoid circular dependency issues at module level
        from app.services.rxnav_service import search_drugs
        
        import asyncio
        # Run both searches concurrently
        rxnav_task = asyncio.create_task(search_drugs(q))
        openfda_task = asyncio.create_task(search_drug_openfda(q))
        
        await asyncio.gather(rxnav_task, openfda_task, return_exceptions=True)
        
        # We need to await the coroutine returned by search_drugs directly if the architecture requires it, 
        # but search_drugs is already an async function. Let's handle exceptions cleanly.
        rxnav_results = await search_drugs(q) if not isinstance(rxnav_task.exception(), Exception) else []
        openfda_results = openfda_task.result() if not isinstance(openfda_task.exception(), Exception) else []
        
        # Merge and deduplicate, prioritizing rxnav matches as they are more rigorous clinical names
        seen = set([r.lower() for r in rxnav_results])
        merged = list(rxnav_results)
        
        for r in openfda_results:
            if r.lower() not in seen:
                seen.add(r.lower())
                merged.append(r)
                
        return {"suggestions": merged[:10]}
    except Exception as e:
        return {"suggestions": []}
