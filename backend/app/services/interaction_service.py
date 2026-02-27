import itertools
import json
from typing import List, Dict
from app.services.drug_data import DRUG_INTERACTIONS, normalize_drug_name
from app.services.rxnav_service import get_drug_interactions_from_rxnav

def check_interactions_local(drug_names: List[str]) -> List[Dict]:
    normalized_names = [normalize_drug_name(name) for name in drug_names]
    found_interactions = []
    
    for pair in itertools.combinations(normalized_names, 2):
        pair_set = frozenset(pair)
        if pair_set in DRUG_INTERACTIONS:
            data = DRUG_INTERACTIONS[pair_set]
            found_interactions.append({
                "drug_1": pair[0],
                "drug_2": pair[1],
                "severity": data["severity"],
                "mechanism": data["mechanism"],
                "recommendation": data["recommendation"],
                "risk_score_weight": data["risk_score_weight"],
                "source": "OpenMed Database"
            })
            
    return found_interactions

async def check_interactions_rxnav(drug_names: List[str]) -> List[Dict]:
    rxnav_results = await get_drug_interactions_from_rxnav(drug_names)
    processed_results = []
    
    for item in rxnav_results:
        severity_mapping = {
            "contraindicated": "contraindicated",
            "high": "major",
            "moderate": "moderate",
            "low": "minor"
        }
        
        raw_severity = item.get("severity", "").lower()
        mapped_severity = severity_mapping.get(raw_severity, "minor")
        
        weight_mapping = {
            "minor": 1.0,
            "moderate": 2.5,
            "major": 4.0,
            "contraindicated": 6.0
        }
        
        processed_results.append({
            "drug_1": item["drug_1"],
            "drug_2": item["drug_2"],
            "severity": mapped_severity,
            "mechanism": item["mechanism"],
            "recommendation": "Consult your physician regarding this interaction.",
            "risk_score_weight": weight_mapping[mapped_severity],
            "source": "RxNav"
        })
        
    return processed_results

async def analyze_drugs(drug_names: List[str]) -> Dict:
    normalized_names = [normalize_drug_name(name) for name in set(drug_names)]
    
    local_interactions = check_interactions_local(normalized_names)
    rxnav_interactions_raw = await check_interactions_rxnav(normalized_names)
    
    local_pairs = set()
    for item in local_interactions:
        local_pairs.add(frozenset([normalize_drug_name(item["drug_1"]), normalize_drug_name(item["drug_2"])]))
        
    merged_interactions = list(local_interactions)
    
    for item in rxnav_interactions_raw:
        pair = frozenset([normalize_drug_name(item["drug_1"]), normalize_drug_name(item["drug_2"])])
        if pair not in local_pairs:
            merged_interactions.append(item)
            local_pairs.add(pair)
            
    merged_interactions.sort(key=lambda x: x["risk_score_weight"], reverse=True)
    
    severity_summary = {
        "contraindicated": 0,
        "major": 0,
        "moderate": 0,
        "minor": 0
    }
    
    highest_severity = "none"
    highest_weight = 0.0
    
    for inter in merged_interactions:
        sev = inter["severity"]
        if sev in severity_summary:
            severity_summary[sev] += 1
            
        weight = inter["risk_score_weight"]
        if weight > highest_weight:
            highest_weight = weight
            highest_severity = sev
            
    return {
        "drugs_analyzed": normalized_names,
        "total_interactions": len(merged_interactions),
        "interactions": merged_interactions,
        "severity_summary": severity_summary,
        "highest_severity": highest_severity
    }
