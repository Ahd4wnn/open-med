from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List
from sqlalchemy.orm import Session
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
    q: str,
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    if len(q) < 2:
        return {"suggestions": [], "sources": ["RxNorm", "DDInter", "OpenFDA"]}
        
    try:
        from app.services.rxnav_service import search_drug_suggestions
        from app.services.ddinter_service import search_ddinter_drugs
        from app.services.openfda_service import search_drug_openfda
        import asyncio
        
        # Run all three searches concurrently
        rxnav_task = asyncio.create_task(search_drug_suggestions(q))
        ddinter_task = asyncio.create_task(search_ddinter_drugs(q))
        openfda_task = asyncio.create_task(search_drug_openfda(q))
        
        await asyncio.gather(rxnav_task, ddinter_task, openfda_task, return_exceptions=True)
        
        rxnav_results = rxnav_task.result() if not isinstance(rxnav_task.exception(), Exception) else []
        ddinter_results = ddinter_task.result() if not isinstance(ddinter_task.exception(), Exception) else []
        openfda_results = openfda_task.result() if not isinstance(openfda_task.exception(), Exception) else []
        
        # Merge and deduplicate
        seen = set()
        merged = []
        
        # Preserving priority order: RxNorm -> DDInter -> OpenFDA
        for item in rxnav_results + ddinter_results + openfda_results:
            lower_item = item.lower()
            if lower_item not in seen:
                seen.add(lower_item)
                merged.append(item.title() if item.islower() else item)
                
        return {"suggestions": merged[:10], "sources": ["RxNorm", "DDInter", "OpenFDA"]}
    except Exception as e:
        return {"suggestions": [], "sources": ["RxNorm", "DDInter", "OpenFDA"]}
