import httpx
import logging
import asyncio
from typing import Optional, List, Dict
from app.config import settings

logger = logging.getLogger(__name__)

async def get_rxcui(drug_name: str) -> Optional[str]:
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{settings.RXNAV_BASE_URL}/rxcui.json",
                params={"name": drug_name, "search": 1}
            )
            response.raise_for_status()
            data = response.json()
            if "idGroup" in data and "rxnormId" in data["idGroup"]:
                return data["idGroup"]["rxnormId"][0]
        except Exception as e:
            logger.error(f"Error fetching rxcui for {drug_name}: {e}")
        return None

async def get_drug_interactions_from_rxnav(drug_names: List[str]) -> List[Dict]:
    try:
        rxcuis = await asyncio.gather(*[get_rxcui(name) for name in drug_names])
        valid_rxcuis = [rxcui for rxcui in rxcuis if rxcui is not None]
        
        if len(valid_rxcuis) < 2:
            return []

        joined_rxcuis = "+".join(valid_rxcuis)
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.RXNAV_BASE_URL}/interaction/list.json",
                params={"rxcuis": joined_rxcuis}
            )
            response.raise_for_status()
            data = response.json()

            interactions = []
            
            if "fullInteractionTypeGroup" not in data:
                return []
                
            for group in data["fullInteractionTypeGroup"]:
                for interaction_type in group.get("fullInteractionType", []):
                    for pair in interaction_type.get("interactionPair", []):
                        try:
                            concept1 = pair["interactionConcept"][0]["minConceptItem"]["name"]
                            concept2 = pair["interactionConcept"][1]["minConceptItem"]["name"]
                            description = pair.get("description", "")
                            
                            # Determine severity
                            severity_mapping = {"high": "major"}
                            severity = "minor"
                            if "severity" in pair: # rxnav usually has severity
                                raw_sev = pair["severity"].lower()
                                severity = severity_mapping.get(raw_sev, raw_sev)

                            interactions.append({
                                "drug_1": concept1,
                                "drug_2": concept2,
                                "severity": severity,
                                "mechanism": description,
                                "source": "RxNav"
                            })
                        except (KeyError, IndexError) as e:
                            logger.error(f"Error parsing interaction pair: {e}")
            
            return interactions
    except Exception as e:
        logger.error(f"Error fetching interactions from RxNav: {e}")
        return []

async def search_drug_suggestions(query: str) -> List[str]:
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{settings.RXNAV_BASE_URL}/spellingsuggestions.json",
                params={"name": query}
            )
            response.raise_for_status()
            data = response.json()
            
            suggestion_group = data.get("suggestionGroup", {})
            suggestion_list = suggestion_group.get("suggestionList", {})
            suggestions = suggestion_list.get("suggestion", [])
            
            return suggestions[:8]
        except Exception as e:
            logger.error(f"Error fetching drug suggestions for query {query}: {e}")
            return []
