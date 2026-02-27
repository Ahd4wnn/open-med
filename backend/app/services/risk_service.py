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
    interactions_input_drugs = interaction_result.get("drugs_analyzed", [])
    
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

    # Flag 1 — Score based (ANY significant score)
    if final_score >= 55:
        clinical_flags.append(
            "HIGH RISK: Immediate clinical review recommended."
        )
    elif final_score >= 25:
        clinical_flags.append(
            "MODERATE RISK: Clinically significant interactions "
            "detected. Review your medication regimen."
        )

    # Flag 2 — Contraindicated pairs (ALWAYS flag)
    for interaction in interactions:
        if interaction.get("severity") == "contraindicated":
            clinical_flags.append(
                f"CONTRAINDICATED: {interaction['drug_1'].title()} "
                f"+ {interaction['drug_2'].title()} should NOT "
                f"be taken together."
            )

    # Flag 3 — Major interactions (ALWAYS flag)
    for interaction in interactions:
        if interaction.get("severity") == "major":
            clinical_flags.append(
                f"MAJOR INTERACTION: "
                f"{interaction['drug_1'].title()} + "
                f"{interaction['drug_2'].title()} — "
                f"{interaction.get('recommendation', 'Consult your physician.')}"
            )

    # Flag 4 — Moderate interactions (flag if 2 or more)
    moderate_interactions = [
        i for i in interactions 
        if i.get("severity") == "moderate"
    ]
    if len(moderate_interactions) >= 2:
        clinical_flags.append(
            f"MULTIPLE MODERATE INTERACTIONS: "
            f"{len(moderate_interactions)} moderate interactions "
            f"detected. Combined effect may be significant."
        )
    elif len(moderate_interactions) == 1:
        i = moderate_interactions[0]
        clinical_flags.append(
            f"MODERATE INTERACTION: "
            f"{i['drug_1'].title()} + {i['drug_2'].title()} — "
            f"{i.get('recommendation', 'Monitor closely.')}"
        )

    # Flag 5 — Patient parameter flags
    if kidney_mult >= 1.9:
        clinical_flags.append(
            "RENAL IMPAIRMENT: Renally-cleared drugs may "
            "accumulate to toxic levels."
        )
    elif kidney_mult >= 1.5:
        clinical_flags.append(
            "REDUCED KIDNEY FUNCTION: Monitor drug levels "
            "and watch for side effects."
        )

    if liver_mult >= 1.4:
        clinical_flags.append(
            "HEPATIC IMPAIRMENT: CYP450-metabolized drugs "
            "may accumulate."
        )

    if age_mult >= 1.5:
        clinical_flags.append(
            "ELDERLY PATIENT: Enhanced sensitivity to "
            "drug interactions."
        )

    if poly_mult >= 1.45:
        clinical_flags.append(
            "HIGH POLYPHARMACY LOAD: Consider medication "
            "reconciliation with your doctor."
        )

    # Flag 6 — Many drugs even without known interactions
    drug_count = len(interactions_input_drugs if interactions_input_drugs else [])
    if len(interactions) == 0 and drug_count >= 5:
        clinical_flags.append(
            f"POLYPHARMACY ALERT: You are taking {drug_count} "
            f"medications. Even without known interactions, "
            f"regular review is recommended."
        )
    
    # Check if interactions list is empty but total > 0
    total = interaction_result.get("total_interactions", 0)
    if total > 0 and len(interactions) == 0:
        clinical_flags.append(
            f"INTERACTIONS DETECTED: {total} drug interaction(s) "
            f"found. Run a full analysis for details."
        )

    if category == "Low" and len(interactions) == 0:
        recommendation = "Current medication combination appears safe. Continue regular monitoring."
    elif category == "Low" and len(interactions) > 0:
        recommendation = "Minor interactions detected. Continue with standard monitoring."
    elif category == "Moderate":
        recommendation = "Clinically significant interactions detected. Review your medication regimen with your doctor."
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
