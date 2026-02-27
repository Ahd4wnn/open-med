from typing import Optional, List, Dict, Tuple, Any
import math
from app.services.pk_data import PK_DRUG_DATA

# CYP Interaction Multipliers
CYP_INHIBITION_MULTIPLIERS = {
    "strong": 5.0,
    "moderate": 2.0,
    "weak": 1.3
}

STRONG_INHIBITORS = {
    "CYP2C9": ["fluconazole", "amiodarone"],
    "CYP3A4": ["clarithromycin", "fluconazole", "amiodarone"],
    "CYP2C19": ["omeprazole", "fluconazole"],
    "CYP2D6": ["amiodarone", "fluoxetine"]
}

MODERATE_INHIBITORS = {
    "CYP2C9": ["ibuprofen", "metronidazole"],
    "CYP3A4": ["amlodipine", "verapamil"],
    "CYP2C19": ["omeprazole"],
    "CYP2D6": []
}

CYP_INDUCTION_MULTIPLIERS = {
    "CYP3A4": 0.3,
    "CYP2C9": 0.4,
    "CYP2C19": 0.4
}

INDUCING_DRUGS = {
    "CYP3A4": ["phenytoin", "rifampin", "carbamazepine"],
    "CYP2C9": ["phenytoin", "rifampin"],
    "CYP2C19": ["phenytoin"]
}

def calculate_patient_clearance_modifier(
    patient_profile: Optional[Any],
    drug_name: str
) -> Tuple[float, List[str]]:
    """Calculates modifier based on renal/hepatic function and age."""
    modifier = 1.0
    explanations = []
    
    if drug_name not in PK_DRUG_DATA:
        return 1.0, ["No PK data available."]
        
    pk = PK_DRUG_DATA[drug_name]
    pathway = pk.get("clearance_pathway", "hepatic")
    
    # Kidney adjustment
    if pathway in ["renal", "mixed", "hepatic_renal"]:
        egfr = getattr(patient_profile, "egfr", None) if patient_profile else None
        if egfr is not None:
            if 45 <= egfr < 60:
                modifier *= 1.3
                explanations.append("Mild renal impairment increases drug exposure by ~30%.")
            elif 30 <= egfr < 45:
                modifier *= 1.7
                explanations.append("Moderate renal impairment increases drug exposure by ~70%.")
            elif 15 <= egfr < 30:
                modifier *= 2.5
                explanations.append("Severe renal impairment increases drug exposure by ~150%. Dose reduction strongly recommended.")
            elif egfr < 15:
                modifier *= 4.0
                explanations.append("Kidney failure: drug may accumulate to 4x normal levels. Specialist dosing required.")

    # Liver adjustment
    if pathway in ["hepatic", "mixed", "hepatic_renal"]:
        liver_score = getattr(patient_profile, "liver_score", None) if patient_profile else None
        if liver_score is not None:
            if liver_score == 2:
                modifier *= 1.5
                explanations.append("Mild liver dysfunction reduces CYP450 metabolism, increasing drug exposure by ~50%.")
            elif liver_score == 3:
                modifier *= 2.8
                explanations.append("Severe liver dysfunction critically impairs drug metabolism. Drug exposure may increase by ~180%. Avoid if possible.")

    # Age adjustment
    age = getattr(patient_profile, "age", None) if patient_profile else None
    if age is not None:
        if age >= 75:
            modifier *= 1.3
            explanations.append("Advanced age reduces hepatic blood flow and enzyme activity by approximately 30%.")
        elif age >= 65:
            modifier *= 1.15
            explanations.append("Elderly patient: moderate reduction in metabolic clearance.")

    return round(modifier, 3), explanations

def calculate_cyp_interaction_effect(
    target_drug: str,
    co_administered_drugs: List[str]
) -> Dict[str, Any]:
    """Calculates effect of co-administered drugs on target's metabolism."""
    if target_drug not in PK_DRUG_DATA:
        return {"multiplier": 1.0, "effects": []}
        
    pk = PK_DRUG_DATA[target_drug]
    substrates = pk.get("cyp_substrate", [])
    
    if not substrates:
        return {"multiplier": 1.0, "effects": []}

    effects = []
    combined_multiplier = 1.0

    # Check for inhibition
    for enzyme in substrates:
        for co_drug in co_administered_drugs:
            if co_drug in STRONG_INHIBITORS.get(enzyme, []):
                combined_multiplier *= CYP_INHIBITION_MULTIPLIERS["strong"]
                effects.append({
                    "type": "inhibition",
                    "strength": "strong",
                    "enzyme": enzyme,
                    "inhibitor_drug": co_drug,
                    "target_drug": target_drug,
                    "effect": f"{co_drug} strongly inhibits {enzyme}, potentially increasing {target_drug} concentration by up to 5x.",
                    "clinical_significance": "HIGH"
                })
            elif co_drug in MODERATE_INHIBITORS.get(enzyme, []):
                combined_multiplier *= CYP_INHIBITION_MULTIPLIERS["moderate"]
                effects.append({
                    "type": "inhibition",
                    "strength": "moderate",
                    "enzyme": enzyme,
                    "inhibitor_drug": co_drug,
                    "target_drug": target_drug,
                    "effect": f"{co_drug} moderately inhibits {enzyme}, potentially increasing {target_drug} concentration by up to 2x.",
                    "clinical_significance": "MODERATE"
                })

    # Check for induction
    for enzyme in substrates:
        for co_drug in co_administered_drugs:
            if co_drug in INDUCING_DRUGS.get(enzyme, []):
                mult = CYP_INDUCTION_MULTIPLIERS.get(enzyme, 0.5)
                combined_multiplier *= mult
                effects.append({
                    "type": "induction",
                    "enzyme": enzyme,
                    "inducer_drug": co_drug,
                    "target_drug": target_drug,
                    "effect": f"{co_drug} induces {enzyme}, potentially reducing {target_drug} concentration by 60-70%.",
                    "clinical_significance": "HIGH"
                })

    # Cap combined multiplier
    combined_multiplier = max(0.1, min(combined_multiplier, 10.0))
    
    return {
        "multiplier": round(combined_multiplier, 3),
        "effects": effects
    }

def simulate_drug_concentration(
    drug_name: str,
    dose_mg: float,
    patient_profile: Optional[Any],
    co_administered_drugs: List[str],
    time_points_hours: List[float]
) -> Dict[str, Any]:
    """Simulates 1-compartment pk concentration curve over time."""
    if drug_name not in PK_DRUG_DATA:
        return {"error": f"No PK data available for {drug_name}"}

    pk = PK_DRUG_DATA[drug_name]

    # 1. Clear modifiers
    clearance_mod, clearance_explanations = calculate_patient_clearance_modifier(patient_profile, drug_name)

    # 2. CYP Effects
    other_drugs = [d for d in co_administered_drugs if d != drug_name]
    cyp_effect = calculate_cyp_interaction_effect(drug_name, other_drugs)

    # 3. Half-life
    base_t_half = pk["half_life_hours"]
    effective_half_life = base_t_half * clearance_mod * cyp_effect["multiplier"]
    effective_half_life = min(effective_half_life, 2000.0)

    # 4. Cmax
    patient_weight = getattr(patient_profile, "weight_kg", 70.0) if patient_profile else 70.0
    vd_liters = pk["volume_of_distribution"] * patient_weight
    absorbed_dose = dose_mg * pk["bioavailability"]
    base_cmax = absorbed_dose / vd_liters
    adjusted_cmax = base_cmax * clearance_mod * cyp_effect["multiplier"]

    # 5. Concentration Curve
    if effective_half_life > 0:
        ke = math.log(2) / effective_half_life
    else:
        ke = 0
        
    curve = []
    for t in time_points_hours:
        c = adjusted_cmax * math.exp(-ke * t)
        curve.append({"time_hours": t, "concentration_mg_l": round(c, 6)})

    # 6. Therapeutic Range Evaluation
    tr_low = pk["therapeutic_range_low"]
    tr_high = pk["therapeutic_range_high"]
    
    is_toxic = adjusted_cmax > tr_high
    is_subtherapeutic = adjusted_cmax < tr_low
    is_therapeutic = tr_low <= adjusted_cmax <= tr_high

    if is_toxic:
        status_label = "Toxic"
        status_color = "red"
        interpretation = f"TOXIC RANGE: {drug_name.title()} concentration ({adjusted_cmax:.3f} mg/L) exceeds therapeutic maximum ({tr_high} mg/L). Dose reduction required."
    elif is_subtherapeutic:
        status_label = "Sub-therapeutic"
        status_color = "yellow"
        interpretation = f"SUB-THERAPEUTIC: {drug_name.title()} concentration ({adjusted_cmax:.3f} mg/L) is below effective range ({tr_low} mg/L). Dose may be insufficient."
    else:
        status_label = "Therapeutic"
        status_color = "green"
        if cyp_effect["effects"] and any(e["type"] == "inhibition" for e in cyp_effect["effects"]):
            interpretation = f"CAUTION: While currently therapeutic, CYP inhibition from co-administered drugs increases {drug_name.title()} exposure. Monitor closely for toxicity signs."
        else:
            interpretation = f"THERAPEUTIC: {drug_name.title()} concentration is within target range. Continue current regimen with standard monitoring."

    # 7. Steady state
    steady_state_hours = 5 * effective_half_life
    steady_state_concentration = adjusted_cmax * 1.44

    return {
        "drug_name": drug_name,
        "dose_mg": dose_mg,
        "pk_parameters": {
            "base_half_life_hours": base_t_half,
            "effective_half_life_hours": round(effective_half_life, 2),
            "base_cmax_mg_l": round(base_cmax, 4),
            "adjusted_cmax_mg_l": round(adjusted_cmax, 4),
            "therapeutic_range": {
                "low": tr_low,
                "high": tr_high,
                "unit": "mg/L"
            },
            "volume_of_distribution_L": round(vd_liters, 2),
            "bioavailability_percent": pk["bioavailability"] * 100,
            "protein_binding_percent": pk["protein_binding"] * 100,
            "clearance_pathway": pk["clearance_pathway"]
        },
        "concentration_curve": curve,
        "status": {
            "is_therapeutic": is_therapeutic,
            "is_toxic": is_toxic,
            "is_subtherapeutic": is_subtherapeutic,
            "status_label": status_label,
            "status_color": status_color
        },
        "steady_state": {
            "time_to_reach_hours": round(steady_state_hours, 1),
            "concentration_mg_l": round(steady_state_concentration, 4)
        },
        "patient_adjustments": {
            "clearance_modifier": clearance_mod,
            "cyp_multiplier": cyp_effect["multiplier"],
            "combined_modifier": round(clearance_mod * cyp_effect["multiplier"], 2),
            "clearance_explanations": clearance_explanations,
            "cyp_effects": cyp_effect["effects"]
        },
        "clinical_interpretation": interpretation
    }

def simulate_full_regimen(
    drug_names: List[str],
    doses: Dict[str, float],
    patient_profile: Optional[Any]
) -> Dict[str, Any]:
    """Simulates PK regimens for multiple drugs and calculates the matrix."""
    time_points = [0, 0.5, 1, 2, 4, 6, 8, 12, 16, 20, 24, 36, 48, 72]
    
    simulations = []
    drugs_without_pk_data = []
    
    normalized_names = [d.lower().strip() for d in drug_names]
    
    for drug in normalized_names:
        if drug in PK_DRUG_DATA:
            dose = doses.get(drug, 100.0)
            sim = simulate_drug_concentration(
                drug, dose, patient_profile, normalized_names, time_points
            )
            if "error" not in sim:
                simulations.append(sim)
            else:
                drugs_without_pk_data.append(drug)
        else:
            drugs_without_pk_data.append(drug)
            
    # Matrix
    interaction_matrix = []
    has_high_cyp = False
    has_mod_cyp = False
    
    for drug_a in normalized_names:
        for drug_b in normalized_names:
            if drug_a != drug_b and drug_a in PK_DRUG_DATA:
                effect = calculate_cyp_interaction_effect(drug_a, [drug_b])
                if effect["multiplier"] != 1.0:
                    interaction_matrix.append({
                        "drug_a": drug_a,
                        "drug_b": drug_b,
                        "effect_on_a": effect,
                        "net_multiplier": effect["multiplier"]
                    })
                    if effect["multiplier"] >= 3.0:
                        has_high_cyp = True
                    elif effect["multiplier"] >= 1.5:
                        has_mod_cyp = True

    # Identify risk overall
    overall_pk_risk = "Low"
    any_toxic = any(s["status"]["is_toxic"] for s in simulations)
    any_subthera = any(s["status"]["is_subtherapeutic"] for s in simulations)
    
    if any_toxic or has_high_cyp:
        overall_pk_risk = "High"
        pk_risk_explanation = "Critically elevated concentrations observed due to toxicity or strong CYP inhibition/organ failure."
    elif any_subthera or has_mod_cyp:
        overall_pk_risk = "Moderate"
        pk_risk_explanation = "Concentration levels may be sub-therapeutic or modified significantly by metabolic interactions."
    else:
        overall_pk_risk = "Low"
        pk_risk_explanation = "All medication concentrations are modeled within relatively normal therapeutic bounds."

    return {
        "simulations": simulations,
        "interaction_matrix": interaction_matrix,
        "overall_pk_risk": overall_pk_risk,
        "pk_risk_explanation": pk_risk_explanation,
        "drugs_without_pk_data": drugs_without_pk_data
    }
