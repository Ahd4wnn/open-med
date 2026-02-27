import httpx
import logging
from typing import Optional, List

logger = logging.getLogger(__name__)

# The new NLM RxNav Base URL
RXNAV_BASE_URL = "https://rxnav.nlm.nih.gov/REST"

async def get_rxcui(drug_name: str) -> Optional[str]:
    """Get the RxNorm Concept Unique Identifier (RxCUI) for a drug name."""
    url = f"{RXNAV_BASE_URL}/rxcui.json"
    params = {"name": drug_name, "search": 1}
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            id_group = data.get("idGroup", {})
            rxnorm_ids = id_group.get("rxnormId", [])
            
            if rxnorm_ids:
                return rxnorm_ids[0]
                
            return None
    except Exception as e:
        logger.error(f"Error fetching RxCUI for {drug_name}: {e}")
        return None

async def get_drug_name_from_rxcui(rxcui: str) -> Optional[str]:
    """Get the normalized drug name from an RxCUI."""
    url = f"{RXNAV_BASE_URL}/rxcui/{rxcui}/property.json"
    params = {"propName": "RxNorm Name"}
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            group = data.get("propConceptGroup", {})
            concepts = group.get("propConcept", [])
            
            if concepts:
                return concepts[0].get("propValue")
                
            return None
    except Exception as e:
        logger.error(f"Error fetching drug name for RxCUI {rxcui}: {e}")
        return None

async def search_drug_suggestions(query: str) -> List[str]:
    """Get spelling suggestions / autocomplete for a drug name query."""
    if not query or len(query) < 2:
        return []
        
    url = f"{RXNAV_BASE_URL}/spellingsuggestions.json"
    params = {"name": query}
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            group = data.get("suggestionGroup", {})
            suggestion_list = group.get("suggestionList", {})
            suggestions = suggestion_list.get("suggestion", [])
            
            return suggestions[:8]
    except Exception as e:
        logger.error(f"Error searching drug suggestions for {query}: {e}")
        return []

async def get_drug_classes(rxcui: str) -> List[str]:
    """Get the pharmacological classes for a given RxCUI."""
    url = f"{RXNAV_BASE_URL}/rxclass/class/byRxcui.json"
    params = {"rxcui": rxcui}
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            info_list = data.get("rxclassDrugInfoList", {})
            infos = info_list.get("rxclassDrugInfo", [])
            
            class_names = set()
            for info in infos:
                concept = info.get("rxclassMinConceptItem", {})
                class_name = concept.get("className")
                if class_name:
                    class_names.add(class_name)
                    
            return list(class_names)[:5]
    except Exception as e:
        logger.error(f"Error fetching drug classes for RxCUI {rxcui}: {e}")
        return []
