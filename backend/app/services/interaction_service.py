import asyncio
from typing import List, Dict, Any

from app.services.drug_data import DRUG_INTERACTIONS, normalize_drug_name
from app.services.ddinter_service import get_interactions_between_drugs
from app.services.openfda_service import get_drug_label, enrich_drug_list
from app.services.rxnav_service import search_drug_suggestions

async def check_interactions_ddinter(drug_names: List[str]) -> List[Dict[str, Any]]:
    """Primary check using DDInter for interactions."""
    normalized_names = [normalize_drug_name(d) for d in drug_names]
    return await get_interactions_between_drugs(normalized_names)

def check_interactions_local(drug_names: List[str]) -> List[Dict[str, Any]]:
    """Fallback check using the local mock database in drug_data.py."""
    normalized_names = [normalize_drug_name(d) for d in drug_names]
    results = []
    
    # Iterate over all pairs
    seen = set()
    for i in range(len(normalized_names)):
        for j in range(i + 1, len(normalized_names)):
            d1 = normalized_names[i]
            d2 = normalized_names[j]
            key = frozenset({d1, d2})
            if key in DRUG_INTERACTIONS and key not in seen:
                seen.add(key)
                data = DRUG_INTERACTIONS[key]
                results.append({
                    "drug_1": d1,
                    "drug_2": d2,
                    "severity": data["severity"],
                    "mechanism": data["mechanism"],
                    "recommendation": data["recommendation"],
                    "risk_score_weight": data["risk_score_weight"],
                    "source": "OpenMed Fallback Database"
                })
    return results

async def enrich_interactions_with_fda(interactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Enrich interactions lacking mechanism data using OpenFDA labels."""
    enriched = []
    enrich_count = 0
    
    for interaction in interactions:
        mechanism = interaction.get("mechanism", "")
        if len(mechanism) < 50 and enrich_count < 3:
            label_data = await get_drug_label(interaction["drug_1"])
            
            if label_data and "drug_interactions" in label_data:
                # OpenFDA drug_interactions is usually a list of strings
                interactions_text = label_data["drug_interactions"][0] if isinstance(label_data["drug_interactions"], list) else str(label_data["drug_interactions"])
                
                # Check if drug_2 is mentioned
                sentence = None
                for s in interactions_text.split(". "):
                    if interaction["drug_2"].lower() in s.lower():
                        sentence = s.strip()
                        break
                        
                if sentence:
                    # Append the sentence to the existing thin mechanism
                    existing_mech = f" ({mechanism})" if mechanism else ""
                    interaction["mechanism"] = f"{sentence}.{existing_mech}".strip()
                    interaction["source"] = "OpenFDA + DDInter" if interaction["source"] == "DDInter" else "OpenFDA + Fallback Database"
            
            enrich_count += 1
            
        enriched.append(interaction)
        
    return enriched

async def analyze_drugs(drug_names: List[str]) -> Dict[str, Any]:
    """Perform a full analysis on a list of drugs utilizing DDInter, OpenFDA, and fallbacks."""
    normalized_names = [normalize_drug_name(d) for d in drug_names]
    
    # PRIMARY: DDInter
    interactions = await check_interactions_ddinter(normalized_names)
    
    # FALLBACK: Local mock DB
    if not interactions:
        interactions = check_interactions_local(normalized_names)
        
    # TEXT ENRICHMENT: OpenFDA (if mechanism is thin)
    if interactions:
        interactions = await enrich_interactions_with_fda(interactions)
        
    # METADATA ENRICHMENT
    drug_metadata = await enrich_drug_list(normalized_names)
    
    # SORT by risk score descending
    interactions.sort(key=lambda x: x["risk_score_weight"], reverse=True)
    
    severity_summary = {
        "contraindicated": 0,
        "major": 0,
        "moderate": 0,
        "minor": 0
    }
    
    for item in interactions:
        sev = item["severity"].lower()
        if sev in severity_summary:
            severity_summary[sev] += 1
            
    highest_severity = "none"
    if severity_summary["contraindicated"] > 0:
        highest_severity = "contraindicated"
    elif severity_summary["major"] > 0:
        highest_severity = "major"
    elif severity_summary["moderate"] > 0:
        highest_severity = "moderate"
    elif severity_summary["minor"] > 0:
        highest_severity = "minor"
        
    sources_used = set(item.get("source", "Unknown") for item in interactions)
    if drug_metadata:
        sources_used.add("OpenFDA")
        
    return {
        "drugs_analyzed": normalized_names,
        "drug_metadata": drug_metadata,
        "total_interactions": len(interactions),
        "interactions": interactions,
        "severity_summary": severity_summary,
        "highest_severity": highest_severity,
        "data_sources": list(sources_used)
    }
