from typing import List, Dict, Any

# Hardcoded mapping of problematic drugs to safer alternatives
SAFER_ALTERNATIVES = {
    "ibuprofen": {
        "alternatives": ["acetaminophen", "celecoxib"],
        "reason": "Lower GI bleeding risk and no platelet inhibition",
        "drug_class": "Analgesic/Anti-inflammatory"
    },
    "warfarin": {
        "alternatives": ["apixaban", "rivaroxaban", "dabigatran"],
        "reason": "DOACs have fewer drug interactions and don't require INR monitoring",
        "drug_class": "Anticoagulant"
    },
    "simvastatin": {
        "alternatives": ["pravastatin", "rosuvastatin", "fluvastatin"],
        "reason": "Lower CYP3A4 metabolism, fewer drug interactions",
        "drug_class": "Statin"
    },
    "amiodarone": {
        "alternatives": ["dronedarone", "flecainide", "sotalol"],
        "reason": "Fewer systemic interactions and lower toxicity profile",
        "drug_class": "Antiarrhythmic"
    },
    "metoprolol": {
        "alternatives": ["bisoprolol", "carvedilol", "nebivolol"],
        "reason": "Similar efficacy with potentially fewer interactions",
        "drug_class": "Beta-blocker"
    },
    "omeprazole": {
        "alternatives": ["pantoprazole", "esomeprazole", "famotidine"],
        "reason": "Less CYP2C19 inhibition, safer with clopidogrel",
        "drug_class": "PPI/H2 blocker"
    },
    "clarithromycin": {
        "alternatives": ["azithromycin", "doxycycline"],
        "reason": "Less CYP3A4 inhibition, fewer drug interactions",
        "drug_class": "Antibiotic"
    },
    "diazepam": {
        "alternatives": ["lorazepam", "oxazepam"],
        "reason": "No active metabolites, safer in elderly and liver disease",
        "drug_class": "Benzodiazepine"
    },
    "codeine": {
        "alternatives": ["tramadol", "acetaminophen", "ibuprofen"],
        "reason": "Avoids CYP2D6 variability and respiratory depression risk",
        "drug_class": "Opioid analgesic"
    },
    "metronidazole": {
        "alternatives": ["tinidazole", "clindamycin"],
        "reason": "Fewer CYP interactions in select indications",
        "drug_class": "Antibiotic/Antiprotozoal"
    }
}

def get_recommendations(interactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Checks the detected interactions against the SAFER_ALTERNATIVES mapping.
    Returns recommendations when severe or moderate interactions exist.
    """
    recommendations_map = {}
    
    for interaction in interactions:
        severity = interaction.get("severity", "").lower()
        # Only suggest alternatives for major or contraindicated interactions
        if severity not in ["major", "contraindicated", "high"]:
            continue
            
        drug1 = interaction.get("drug1", "").lower()
        drug2 = interaction.get("drug2", "").lower()
        
        # Check drug 1
        if drug1 in SAFER_ALTERNATIVES:
            if drug1 not in recommendations_map:
                info = SAFER_ALTERNATIVES[drug1]
                alts = [{"name": alt, "reason": info["reason"], "drug_class": info["drug_class"]} for alt in info["alternatives"]]
                recommendations_map[drug1] = {
                    "problematic_drug": drug1.capitalize(),
                    "interacts_with": drug2.capitalize(),
                    "severity": severity.capitalize(),
                    "alternatives": alts,
                    "recommendation_note": f"Consider replacing {drug1.capitalize()} with one of these alternatives to reduce interaction risk. Consult prescribing physician."
                }
                
        # Check drug 2
        if drug2 in SAFER_ALTERNATIVES:
            if drug2 not in recommendations_map:
                info = SAFER_ALTERNATIVES[drug2]
                alts = [{"name": alt, "reason": info["reason"], "drug_class": info["drug_class"]} for alt in info["alternatives"]]
                recommendations_map[drug2] = {
                    "problematic_drug": drug2.capitalize(),
                    "interacts_with": drug1.capitalize(),
                    "severity": severity.capitalize(),
                    "alternatives": alts,
                    "recommendation_note": f"Consider replacing {drug2.capitalize()} with one of these alternatives to reduce interaction risk. Consult prescribing physician."
                }
                
    return list(recommendations_map.values())

def get_patient_history_recommendations(previous_assessments: List[Dict[str, Any]], current_drugs: List[str]) -> Dict[str, Any]:
    """
    Analyzes patient's previous risk assessments to find drugs that chronically cause interactions.
    """
    if not previous_assessments:
        return {"chronic_risk_drugs": [], "total_assessments_analyzed": 0, "pattern_note": "Not enough history to analyze."}
        
    problem_drug_counts = {}
    total_analyzed = len(previous_assessments)
    current_drugs_lower = [d.lower() for d in current_drugs]
    
    for assessment in previous_assessments:
        cat = assessment.get("final_risk_category", "")
        # Look at assessments that resulted in moderate or severe risk
        if cat in ["Severe", "Moderate", "High"]:
            # Count the drugs that were present
            drugs = assessment.get("drug_names", [])
            for drug in drugs:
                d_lower = drug.lower()
                # We only care about drugs still in their current query
                if d_lower in current_drugs_lower:
                    if d_lower not in problem_drug_counts:
                        problem_drug_counts[d_lower] = {
                            "count": 0,
                            "severities": []
                        }
                    problem_drug_counts[d_lower]["count"] += 1
                    problem_drug_counts[d_lower]["severities"].append(cat)
                    
    # Filter to only return drugs that appeared multiple times in bad assessments
    chronic_drugs = []
    for drug, data in problem_drug_counts.items():
        if data["count"] > 1:
            # Simple most-common severity calculation
            severity_counts = {}
            for s in data["severities"]:
                severity_counts[s] = severity_counts.get(s, 0) + 1
            avg_severity = max(severity_counts, key=severity_counts.get)
            
            chronic_drugs.append({
                "drug": drug.capitalize(),
                "appeared_in_assessments": data["count"],
                "avg_severity": avg_severity,
                "suggestion": f"History shows {drug.capitalize()} consistently causes {avg_severity.lower()} interactions. A review of this therapy is strongly advised."
            })
            
    # Sort by frequency
    chronic_drugs.sort(key=lambda x: x["appeared_in_assessments"], reverse=True)
    
    note = "No chronic risk patterns detected in recent history."
    if chronic_drugs:
        note = f"Identified {len(chronic_drugs)} medication(s) repeatedly contributing to elevated interaction risk scores across multiple visits."
        
    return {
        "chronic_risk_drugs": chronic_drugs[:3], # Top 3 worst offenders
        "pattern_note": note,
        "total_assessments_analyzed": total_analyzed
    }
