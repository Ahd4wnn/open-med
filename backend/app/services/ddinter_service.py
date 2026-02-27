import httpx
import asyncio
import logging
from typing import List, Dict, Any, Set

logger = logging.getLogger(__name__)

DDINTER_BASE_URL = "https://ddinter.scbdd.com/api"

DDINTER_SEVERITY_MAP = {
    "Major": "major",
    "Moderate": "moderate", 
    "Minor": "minor",
    "Contraindicated": "contraindicated",
    "Unknown": "minor"
}

DDINTER_WEIGHT_MAP = {
    "contraindicated": 6.0,
    "major": 4.0,
    "moderate": 2.5,
    "minor": 1.0
}

# Module-level cache for interactions
_interaction_cache: Dict[str, List[Dict[str, Any]]] = {}

async def get_interactions_for_drug(drug_name: str) -> List[Dict[str, Any]]:
    """Fetch all interactions for a specific drug from DDInter."""
    normalized_query = drug_name.lower().strip()
    
    # Check cache first
    if normalized_query in _interaction_cache:
        return _interaction_cache[normalized_query]
        
    url = f"{DDINTER_BASE_URL}/interaction/"
    params = {"drug": normalized_query, "format": "json"}
    
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            results = data.get("results", [])
            formatted_results = []
            
            for item in results:
                d1 = item.get("drug_1", {}).get("name", "").lower()
                d2 = item.get("drug_2", {}).get("name", "").lower()
                
                raw_level = item.get("level", "Unknown")
                severity = DDINTER_SEVERITY_MAP.get(raw_level, "minor")
                weight = DDINTER_WEIGHT_MAP.get(severity, 1.0)
                
                mechanism = item.get("mechanism", "")[:400]
                recommendation = item.get("management", "")[:300]
                
                formatted_results.append({
                    "drug_1": d1,
                    "drug_2": d2,
                    "severity": severity,
                    "mechanism": mechanism,
                    "recommendation": recommendation,
                    "risk_score_weight": weight,
                    "source": "DDInter"
                })
                
            _interaction_cache[normalized_query] = formatted_results
            return formatted_results
            
    except Exception as e:
        logger.error(f"Error fetching DDInter for {drug_name}: {e}")
        return []

async def get_interactions_between_drugs(drug_names: List[str]) -> List[Dict[str, Any]]:
    """Fetch and mutually filter interactions for a list of drugs."""
    normalized_names = [d.lower().strip() for d in drug_names]
    
    # Concurrently fetch all interactions for all provided drugs
    tasks = [get_interactions_for_drug(drug) for drug in normalized_names]
    results_lists = await asyncio.gather(*tasks, return_exceptions=True)
    
    all_interactions = []
    for res in results_lists:
        if isinstance(res, list):
            all_interactions.extend(res)
            
    # Filter to interactions where BOTH drugs are in our query list
    filtered = []
    seen = set()
    
    for interaction in all_interactions:
        d1 = interaction["drug_1"]
        d2 = interaction["drug_2"]
        
        if d1 in normalized_names and d2 in normalized_names and d1 != d2:
            # Deduplicate pairs
            pair_key = frozenset([d1, d2])
            if pair_key not in seen:
                seen.add(pair_key)
                filtered.append(interaction)
                
    # Sort by risk score weight descending
    filtered.sort(key=lambda x: x["risk_score_weight"], reverse=True)
    
    return filtered

async def get_drug_details(drug_name: str) -> Dict[str, Any]:
    """Fetch metadata for a drug from DDInter."""
    url = f"{DDINTER_BASE_URL}/drug/"
    params = {"name": drug_name.lower().strip(), "format": "json"}
    
    default_resp = {"name": drug_name, "source": "DDInter"}
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            results = data.get("results", [])
            if results:
                info = results[0]
                return {
                    "name": info.get("name", drug_name),
                    "drugbank_id": info.get("drugbank_id", ""),
                    "drug_class": info.get("drug_class", ""),
                    "description": info.get("description", "")[:300],
                    "source": "DDInter"
                }
            return default_resp
    except Exception as e:
        logger.error(f"Error fetching DDInter details for {drug_name}: {e}")
        return default_resp

async def search_ddinter_drugs(query: str) -> List[str]:
    """Search for drug names in DDInter."""
    if not query or len(query) < 2:
        return []
        
    url = f"{DDINTER_BASE_URL}/drug/"
    params = {"name": query, "format": "json"}
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            results = data.get("results", [])
            names = [r.get("name") for r in results if r.get("name")]
            return names[:8]
    except Exception as e:
        logger.error(f"Error searching DDInter for {query}: {e}")
        return []
