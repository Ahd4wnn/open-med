import json
import logging
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
import httpx

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.config import settings
from app.models.patient_profile import PatientProfile
from app.models.risk_assessment import RiskAssessment
from app.services.interaction_service import analyze_drugs
from app.services.food_drug_data import FOOD_DRUG_INTERACTIONS, LIFESTYLE_CONDITION_RISKS

logger = logging.getLogger(__name__)

def analyze_food_and_lifestyle(lifestyle_log: Any, patient_medications: List[str]) -> Dict[str, Any]:
    """Agent 1: Food & Lifestyle Analyzer"""
    
    # Normalize medications
    normalized_meds = [m.lower().strip() for m in patient_medications]
    
    # Step 1: Food Analysis
    food_items = []
    if lifestyle_log and lifestyle_log.food_log:
        if isinstance(lifestyle_log.food_log, str):
            try:
                food_items = json.loads(lifestyle_log.food_log)
            except json.JSONDecodeError:
                pass
        elif isinstance(lifestyle_log.food_log, list):
            food_items = lifestyle_log.food_log

    normalized_foods = [f.lower().strip() for f in food_items]
    
    food_risks = []
    
    for food in normalized_foods:
        # Exact and partial matching
        matched_interactions = []
        for kb_food, interactions in FOOD_DRUG_INTERACTIONS.items():
            if kb_food in food:
                matched_interactions.extend(interactions)
                
        for interaction in matched_interactions:
            # Check overlap with patient medications
            overlap = [med for med in normalized_meds if med in interaction.get("specific_drugs", [])]
            if overlap:
                for med in overlap:
                    food_risks.append({
                        "food_item": food,
                        "drug": med.capitalize(),
                        "effect": interaction["effect"],
                        "severity": interaction["severity"],
                        "mechanism": interaction["mechanism"],
                        "recommendation": interaction["recommendation"]
                    })

    # Step 2: Lifestyle Factor Analysis
    lifestyle_flags = []
    
    if lifestyle_log:
        if lifestyle_log.smoking_status == "current":
            flag = dict(LIFESTYLE_CONDITION_RISKS["smoking_current"])
            flag["factor"] = "Smoking"
            lifestyle_flags.append(flag)
            
        if lifestyle_log.alcohol_units_per_week and lifestyle_log.alcohol_units_per_week > 14:
            flag = dict(LIFESTYLE_CONDITION_RISKS["alcohol_heavy"])
            flag["factor"] = "Heavy Alcohol Use"
            lifestyle_flags.append(flag)
            
        if lifestyle_log.sleep_quality in ["poor", "fair"] or (lifestyle_log.sleep_hours and lifestyle_log.sleep_hours < 6):
            flag = dict(LIFESTYLE_CONDITION_RISKS["sleep_poor"])
            flag["factor"] = "Poor Sleep"
            lifestyle_flags.append(flag)
            
        if lifestyle_log.activity_level == "sedentary":
            flag = dict(LIFESTYLE_CONDITION_RISKS["sedentary"])
            flag["factor"] = "Sedentary Lifestyle"
            lifestyle_flags.append(flag)
            
        if lifestyle_log.stress_level and lifestyle_log.stress_level >= 7:
            flag = dict(LIFESTYLE_CONDITION_RISKS["stress_high"])
            flag["factor"] = "High Stress"
            lifestyle_flags.append(flag)
            
    # Filter drug_effects for patient medications
    for flag in lifestyle_flags:
        relevant_effects = []
        for drug_class, effect in flag.get("drug_effects", {}).items():
            # Loose matching for drug classes
            relevant_effects.append(f"{drug_class.capitalize()}: {effect}")
        flag["drug_specific_effects"] = relevant_effects

    # Step 3: Compute agent 1 risk score
    sev_weights = {"major": 4.0, "moderate": 2.5, "minor": 1.0}
    base = sum([sev_weights.get(fr.get("severity", "minor"), 1.0) for fr in food_risks])
    
    lifestyle_multiplier = 1.0
    for flag in lifestyle_flags:
        lifestyle_multiplier *= flag.get("risk_multiplier", 1.0)
        
    agent_1_score = min(base * lifestyle_multiplier, 50.0)
    
    return {
        "agent": "Food & Lifestyle Analyzer",
        "food_risks": food_risks,
        "lifestyle_flags": [{ 
            "factor": f["factor"], 
            "risk_multiplier": f.get("risk_multiplier", 1.0),
            "conditions_worsened": f.get("conditions_worsened", []),
            "drug_specific_effects": f.get("drug_specific_effects", []),
            "recommendation": f.get("recommendation", "")
        } for f in lifestyle_flags],
        "agent_1_score": round(agent_1_score, 1),
        "total_food_risks": len(food_risks),
        "total_lifestyle_flags": len(lifestyle_flags),
        "high_severity_food_risks": sum(1 for fr in food_risks if fr.get("severity") == "major")
    }


def analyze_medications_and_conditions(
    agent_1_report: Dict[str, Any],
    patient_profile: Optional[Any],
    medication_interactions: List[Dict[str, Any]],
    risk_breakdown: Dict[str, Any]
) -> Dict[str, Any]:
    """Agent 2: Medical Context Analyzer"""
    
    # Step 1: Cross-reference food risks
    cross_referenced_food = []
    
    # Flatten medication_interactions into a simpler lookup list of involved drugs
    involved_drugs = set()
    for ix in medication_interactions:
        involved_drugs.add(ix.get("drug1", "").lower())
        involved_drugs.add(ix.get("drug2", "").lower())
        
    for fr in agent_1_report.get("food_risks", []):
        risk = dict(fr)
        drug = risk["drug"].lower()
        if drug in involved_drugs:
            risk["clinically_confirmed"] = True
        else:
            risk["clinically_confirmed"] = False
        cross_referenced_food.append(risk)
        
    # Step 2: Lifestyle impact on existing conditions
    patient_conditions = []
    if patient_profile and patient_profile.medical_conditions:
        patient_conditions = [c.strip().lower() for c in patient_profile.medical_conditions.split(",")]
        
    high_relevance_flags = []
    for lf in agent_1_report.get("lifestyle_flags", []):
        flag = dict(lf)
        flag["high_relevance"] = False
        for cond in flag.get("conditions_worsened", []):
            if any(cond in pc or pc in cond for pc in patient_conditions):
                flag["high_relevance"] = True
                break
        high_relevance_flags.append(flag)
        
    # Step 3: Compute combined risk
    medication_risk_score = risk_breakdown.get("final_score", 0.0)
    lifestyle_risk_contribution = agent_1_report.get("agent_1_score", 0.0)
    
    combined_score = min(medication_risk_score + (lifestyle_risk_contribution * 0.4), 100.0)
    combined_score = round(combined_score, 1)
    
    if combined_score <= 25:
        combined_category = "Low"
    elif combined_score <= 55:
        combined_category = "Moderate"
    else:
        combined_category = "Severe"
        
    # Step 4: Priority recommendations
    recommendations = []
    # Major confirmed food risks
    for cr in [r for r in cross_referenced_food if r.get("clinically_confirmed") and r.get("severity") == "major"]:
        recommendations.append(f"CRITICAL: {cr['recommendation']} ({cr['food_item'].capitalize()} interacts with {cr['drug']})")
    
    # High risk lifestyle flags
    sorted_flags = sorted(high_relevance_flags, key=lambda x: x.get("risk_multiplier", 1.0), reverse=True)
    for fl in sorted_flags:
        if fl.get("high_relevance"):
            recommendations.append(f"HIGH PRIORITY: {fl['recommendation']} (Worsens your existing conditions)")
            
    # Add other food risks
    for cr in [r for r in cross_referenced_food if not r.get("clinically_confirmed") or r.get("severity") != "major"]:
        if len(recommendations) < 7:
            recommendations.append(f"ADVISORY: {cr['recommendation']} ({cr['food_item'].capitalize()} may interact with {cr['drug']})")
            
    # Add other flags
    for fl in sorted_flags:
        if not fl.get("high_relevance"):
            if len(recommendations) < 7:
                recommendations.append(f"LIFESTYLE: {fl['recommendation']}")

    return {
        "agent": "Medical Context Analyzer",
        "cross_referenced_food_risks": cross_referenced_food,
        "high_relevance_lifestyle_flags": high_relevance_flags,
        "medication_risk_score": medication_risk_score,
        "lifestyle_risk_contribution": lifestyle_risk_contribution,
        "combined_score": combined_score,
        "combined_category": combined_category,
        "priority_recommendations": recommendations[:7],
        "agent_2_score": combined_score
    }


async def generate_lifestyle_ai_report(
    agent_1_report: Dict[str, Any],
    agent_2_report: Dict[str, Any],
    patient_profile: Optional[Any],
    patient_medications: List[str]
) -> Dict[str, Any]:
    """Passes the pipeline reports to Featherless.ai to generate a final synthesised summary."""
    if not settings.FEATHERLESS_API_KEY:
        return {"report_text": "", "error": "Featherless API Key not configured."}
        
    age = getattr(patient_profile, "age", "Not provided") if patient_profile else "Not provided"
    conditions = getattr(patient_profile, "medical_conditions", "None listed") if patient_profile and getattr(patient_profile, "medical_conditions", "") else "None listed"
    medications_str = ", ".join(patient_medications)

    top_foods = "\n".join([f"- {f['food_item']} with {f['drug']}: {f['effect']} ({f['severity']})" 
                           for f in agent_1_report.get("food_risks", [])[:5]])
    if not top_foods:
        top_foods = "- No specific food-drug risks detected."

    flags = "\n".join([f"- {f['factor']}: {f['recommendation']}" for f in agent_1_report.get("lifestyle_flags", [])])
    if not flags:
        flags = "- No major lifestyle flags detected."

    priorities = "\n".join([f"{i+1}. {r}" for i, r in enumerate(agent_2_report.get("priority_recommendations", []))])
    if not priorities:
        priorities = "1. Continue healthy habits.\n2. Monitor for changes."

    confirmed_count = sum(1 for f in agent_2_report.get("cross_referenced_food_risks", []) if f.get("clinically_confirmed"))

    system_prompt = """You are a clinical lifestyle medicine specialist and pharmacist. 
You have received reports from two AI analysis agents \u2014 one focused on food and lifestyle factors, one on medical and medication context. 
Synthesize these into a clear, actionable, patient-friendly report. 
Be warm, specific, and evidence-based."""

    user_prompt = f"""Generate a personalized lifestyle and medication safety report based on the following multi-agent analysis:

PATIENT PROFILE:
- Age: {age}
- Conditions: {conditions}
- Medications: {medications_str}

AGENT 1 \u2014 FOOD & LIFESTYLE FINDINGS:
Food Risks Detected: {agent_1_report.get('total_food_risks', 0)}
High Severity: {agent_1_report.get('high_severity_food_risks', 0)}
Top Food Risks:
{top_foods}

Lifestyle Flags:
{flags}

AGENT 2 \u2014 MEDICAL CONTEXT:
Combined Risk Score: {agent_2_report.get('combined_score', 0)}/100 ({agent_2_report.get('combined_category', 'Unknown')})
Clinically Confirmed Food-Drug Interactions: {confirmed_count}

TOP PRIORITY RECOMMENDATIONS:
{priorities}

Please provide:
1. A 2-sentence overall lifestyle health summary
2. Top 3 specific food changes with clinical reasoning
3. Top 3 lifestyle modifications most impacting their medications
4. A sleep and metabolism section (based on their sleep and activity data)
5. A motivational closing statement

Keep total response under 400 words. Use plain English and do not output markdown formatting like bolding or headers, just separate the sections by newlines."""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            payload = {
                "model": settings.FEATHERLESS_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "max_tokens": 800,
                "temperature": 0.3
            }
            
            response = await client.post(
                f"{settings.FEATHERLESS_BASE_URL.rstrip('/')}/chat/completions",
                headers={"Authorization": f"Bearer {settings.FEATHERLESS_API_KEY}", "Content-Type": "application/json"},
                json=payload
            )
            
            if response.status_code == 200:
                data = response.json()
                text = data["choices"][0]["message"]["content"].strip()
                
                parts = text.split('\n\n')
                return {
                    "report_text": text,
                    "model_used": settings.FEATHERLESS_MODEL,
                    "sections": {
                        "overall_summary": parts[0] if len(parts) > 0 else "Analysis completed.",
                        "food_changes": parts[1] if len(parts) > 1 else "",
                        "lifestyle_modifications": parts[2] if len(parts) > 2 else "",
                        "sleep_and_metabolism": parts[3] if len(parts) > 3 else "",
                        "closing": parts[4] if len(parts) > 4 else parts[-1] if parts else ""
                    }
                }
            else:
                return {"report_text": "", "error": f"API Error: {response.text}"}
    except Exception as e:
        logger.error(f"Generate AI Report Error: {str(e)}")
        return {"report_text": "", "error": str(e)}


async def run_multi_agent_pipeline(
    user_id: int,
    lifestyle_log: Any,
    patient_profile: Optional[Any],
    drug_names: List[str],
    db: AsyncSession
) -> Dict[str, Any]:
    
    # Step 1: Run analyze_drugs
    interaction_result = await analyze_drugs(drug_names, patient_profile)
    
    # Step 2: Get latest risk assessment
    risk_breakdown = {"final_score": 0.0, "risk_category": "Low"}
    latest_assessment_result = await db.execute(
        select(RiskAssessment)
        .where(RiskAssessment.user_id == user_id)
        .order_by(RiskAssessment.created_at.desc())
        .limit(1)
    )
    latest_assessment = latest_assessment_result.scalars().first()
    
    if latest_assessment and latest_assessment.breakdown_json:
        try:
            rb = json.loads(latest_assessment.breakdown_json)
            risk_breakdown = rb
        except json.JSONDecodeError:
            pass

    # Step 3: Run Agent 1
    agent_1_report = analyze_food_and_lifestyle(lifestyle_log, drug_names)
    
    # Step 4: Run Agent 2
    agent_2_report = analyze_medications_and_conditions(
        agent_1_report, 
        patient_profile, 
        interaction_result.get("interactions", []), 
        risk_breakdown
    )
    
    # Step 5: Run AI Synthesizer
    ai_report = await generate_lifestyle_ai_report(
        agent_1_report, 
        agent_2_report, 
        patient_profile, 
        drug_names
    )
    
    return {
        "pipeline_id": str(uuid.uuid4()),
        "agent_1_report": agent_1_report,
        "agent_2_report": agent_2_report,
        "ai_report": ai_report,
        "interaction_context": {
            "total_drug_interactions": interaction_result.get("total_interactions", 0),
            "highest_severity": interaction_result.get("highest_severity", "unknown")
        },
        "final_combined_score": agent_2_report["combined_score"],
        "final_category": agent_2_report["combined_category"],
        "generated_at": datetime.utcnow().isoformat()
    }
