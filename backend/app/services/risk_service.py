from typing import Optional, Tuple, Dict, Any

SEVERITY_BASE_SCORES = {
    "contraindicated": 35,
    "major": 20,
    "moderate": 10,
    "minor": 3
}

RISK_CATEGORIES = [
    (0, 25, "Low"),
    (25, 55, "Moderate"),
    (55, 100, "Severe")
]

def calculate_age_multiplier(age: Optional[int]) -> Tuple[float, str]:
    if age is None:
        return 1.0, "Age not provided, no adjustment applied."
    if age < 18:
        return 1.1, "Pediatric patient: slightly increased sensitivity to drug interactions."
    elif 18 <= age <= 64:
        return 1.0, "Adult age range: standard metabolic baseline."
    elif 65 <= age <= 74:
        return 1.3, "Early elderly: reduced hepatic and renal clearance begins."
    elif 75 <= age <= 84:
        return 1.5, "Elderly: significantly reduced drug metabolism and clearance."
    else:
        return 1.8, "Advanced elderly: severely reduced metabolic capacity, high sensitivity."

def calculate_kidney_multiplier(egfr: Optional[float]) -> Tuple[float, str]:
    if egfr is None:
        return 1.0, "Kidney function not provided, no adjustment applied."
    if egfr >= 60:
        return 1.0, "Normal kidney function: standard renal drug clearance."
    elif 45 <= egfr < 60:
        return 1.2, "Mildly reduced kidney function (Stage 2 CKD): slight reduction in renal drug clearance."
    elif 30 <= egfr < 45:
        return 1.5, "Moderate kidney impairment (Stage 3 CKD): significant reduction in renally-cleared drugs."
    elif 15 <= egfr < 30:
        return 1.9, "Severe kidney impairment (Stage 4 CKD): most renally-cleared drugs accumulate dangerously."
    else:
        return 2.4, "Kidney failure (Stage 5 CKD/ESRD): extreme drug accumulation risk, requires specialist review."

def calculate_liver_multiplier(liver_score: Optional[int]) -> Tuple[float, str]:
    if liver_score is None:
        return 1.0, "Liver function not provided, no adjustment applied."
    if liver_score == 1:
        return 1.0, "Normal liver function: standard hepatic drug metabolism."
    elif liver_score == 2:
        return 1.4, "Mild liver dysfunction: reduced CYP450 enzyme activity, slower drug metabolism."
    elif liver_score == 3:
        return 2.0, "Severe liver dysfunction: critically impaired drug metabolism, high toxicity accumulation risk."
    else:
        return 1.0, "Invalid liver score, no adjustment applied."

def calculate_polypharmacy_multiplier(drug_count: int) -> Tuple[float, str]:
    if drug_count <= 2:
        return 1.0, "Low polypharmacy load: minimal combinatorial interaction risk."
    elif 3 <= drug_count <= 4:
        return 1.1, "Mild polypharmacy: slightly increased risk from drug combinations."
    elif 5 <= drug_count <= 6:
        return 1.25, "Moderate polypharmacy (5-6 drugs): meaningful increase in interaction complexity."
    elif 7 <= drug_count <= 9:
        return 1.45, "High polypharmacy (7-9 drugs): high probability of clinically significant interactions."
    else:
        return 1.7, "Extreme polypharmacy (10+ drugs): exponential interaction risk, immediate clinical review recommended."

def calculate_base_interaction_score(interactions: list[dict]) -> Tuple[float, str]:
    if not interactions:
        return 0.0, "No drug interactions detected."
        
    counts = {"contraindicated": 0, "major": 0, "moderate": 0, "minor": 0}
    base_score = 0.0
    
    for inter in interactions:
        sev = inter.get("severity", "minor")
        counts[sev] += 1
        
        # Diminishing returns calculation
        if counts[sev] == 1:
            multiplier = 1.0
        elif counts[sev] == 2:
            multiplier = 0.7
        else:
            multiplier = 0.5
            
        base_score += SEVERITY_BASE_SCORES.get(sev, 0) * multiplier

    final_base = min(base_score, 70.0)
    explanation = f"Base interaction score from {len(interactions)} detected interaction(s): {counts['contraindicated']} contraindicated, {counts['major']} major, {counts['moderate']} moderate, {counts['minor']} minor."
    
    return final_base, explanation

def compute_risk_score(interaction_result: dict, patient_profile: Optional[Any]) -> dict:
    interactions = interaction_result.get("interactions", [])
    drugs_analyzed = interaction_result.get("drugs_analyzed", [])
    
    base_score, base_exp = calculate_base_interaction_score(interactions)
    
    age_mult, age_exp = calculate_age_multiplier(getattr(patient_profile, "age", None) if patient_profile else None)
    kidney_mult, kidney_exp = calculate_kidney_multiplier(getattr(patient_profile, "egfr", None) if patient_profile else None)
    liver_mult, liver_exp = calculate_liver_multiplier(getattr(patient_profile, "liver_score", None) if patient_profile else None)
    poly_mult, poly_exp = calculate_polypharmacy_multiplier(len(drugs_analyzed))
    
    combined_mult = age_mult * kidney_mult * liver_mult * poly_mult
    final_score = min(base_score * combined_mult, 100.0)
    final_score = round(final_score, 1)
    
    category = "Severe"
    for low, high, cat in RISK_CATEGORIES:
        if low <= final_score < high:
            category = cat
            break
            
    if final_score == 100.0:
        category = "Severe"
        
    clinical_flags = []
    if final_score >= 55.0:
        clinical_flags.append("HIGH RISK: Immediate clinical review recommended.")
        
    for inter in interactions:
        if inter["severity"] == "contraindicated":
            clinical_flags.append(f"CONTRAINDICATED PAIR DETECTED: {inter['drug_1']} + {inter['drug_2']}. Do not co-administer.")
        elif inter["severity"] == "major":
            clinical_flags.append(f"MAJOR INTERACTION: {inter['drug_1']} + {inter['drug_2']} — {inter.get('recommendation', '')}")
            
    if kidney_mult >= 1.9:
        clinical_flags.append("RENAL IMPAIRMENT: Renally-cleared drugs may accumulate to toxic levels.")
    if liver_mult >= 1.4:
        clinical_flags.append("HEPATIC IMPAIRMENT: CYP450-metabolized drugs may accumulate.")
    if age_mult >= 1.5:
        clinical_flags.append("ELDERLY PATIENT: Enhanced sensitivity to drug interactions.")
    if poly_mult >= 1.45:
        clinical_flags.append("HIGH POLYPHARMACY LOAD: Consider medication reconciliation.")
        
    if category == "Low":
        recommendation = "Current medication combination appears relatively safe. Continue regular monitoring."
    elif category == "Moderate":
        recommendation = "Clinically significant interactions detected. Review medication regimen with prescribing physician."
    else:
        recommendation = "HIGH RISK COMBINATION. Immediate medication review required. Do not proceed without specialist consultation."

    return {
        "final_score": final_score,
        "risk_category": category,
        "base_interaction_score": round(base_score, 1),
        "base_explanation": base_exp,
        "multipliers": {
            "age": { "value": age_mult, "explanation": age_exp },
            "kidney": { "value": kidney_mult, "explanation": kidney_exp },
            "liver": { "value": liver_mult, "explanation": liver_exp },
            "polypharmacy": { "value": poly_mult, "explanation": poly_exp },
            "combined": round(combined_mult, 2)
        },
        "interactions_summary": interaction_result.get("severity_summary", {
            "contraindicated": 0, "major": 0, "moderate": 0, "minor": 0
        }),
        "clinical_flags": clinical_flags,
        "recommendation": recommendation
    }

def get_risk_label_color(category: str) -> str:
    if category == "Low":
        return "green"
    elif category == "Moderate":
        return "yellow"
    elif category == "Severe":
        return "red"
    return "gray"
