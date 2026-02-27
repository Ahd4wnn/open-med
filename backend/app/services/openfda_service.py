import httpx
import asyncio
from typing import List, Dict, Any
from app.config import settings

# Base URL is https://api.fda.gov/drug
BASE_URL = settings.OPENFDA_BASE_URL

async def get_drug_label(drug_name: str) -> Dict[str, Any]:
    """
    Fetches the drug label from OpenFDA using generic_name, falling back to brand_name.
    Extracts key fields safely.
    """
    async with httpx.AsyncClient() as client:
        try:
            # Try generic name first
            url = f"{BASE_URL}/label.json?search=openfda.generic_name:\"{drug_name}\"&limit=1"
            response = await client.get(url, timeout=10.0)
            
            if response.status_code != 200:
                # Fallback to brand name
                url = f"{BASE_URL}/label.json?search=openfda.brand_name:\"{drug_name}\"&limit=1"
                response = await client.get(url, timeout=10.0)
                
                if response.status_code != 200:
                    raise Exception("Not found in OpenFDA")

            data = response.json()
            results = data.get("results", [])
            if not results:
                raise Exception("Empty results")
                
            res = results[0]
            openfda = res.get("openfda", {})
            
            # Extract fields safely
            generic_name = openfda.get("generic_name", [drug_name])[0] if openfda.get("generic_name") else drug_name
            brand_names = openfda.get("brand_name", [])
            drug_class = openfda.get("pharm_class_epc", [])
            manufacturer = openfda.get("manufacturer_name", ["Unknown"])[0] if openfda.get("manufacturer_name") else "Unknown"
            
            warnings = res.get("warnings", [""])[0][:500] if res.get("warnings") else ""
            contraindications = res.get("contraindications", [""])[0][:500] if res.get("contraindications") else ""
            drug_interactions_text = res.get("drug_interactions", [""])[0][:800] if res.get("drug_interactions") else ""
            
            dosage_forms = openfda.get("dosage_form", [])
            route = openfda.get("route", [])
            purpose = res.get("purpose", [""])[0][:300] if res.get("purpose") else ""

            return {
                "drug_name": drug_name,
                "generic_name": generic_name,
                "brand_names": brand_names,
                "drug_class": drug_class,
                "manufacturer": manufacturer,
                "warnings": warnings,
                "contraindications": contraindications,
                "drug_interactions_text": drug_interactions_text,
                "dosage_forms": dosage_forms,
                "route": route,
                "purpose": purpose,
                "source": "OpenFDA"
            }
        except Exception as e:
            # Return minimal dict on any failure
            return {
                "drug_name": drug_name,
                "generic_name": drug_name,
                "brand_names": [],
                "drug_class": [],
                "manufacturer": "Unknown",
                "warnings": "",
                "contraindications": "",
                "drug_interactions_text": "",
                "dosage_forms": [],
                "route": [],
                "purpose": "",
                "source": "OpenFDA (Error)"
            }

async def get_drug_interactions_fda(drug_name: str) -> List[Dict[str, str]]:
    """
    Extracts the drug_interactions text and attempts to parse mentioned drugs.
    """
    try:
        async with httpx.AsyncClient() as client:
            url = f"{BASE_URL}/label.json?search=openfda.generic_name:\"{drug_name}\"&limit=1"
            response = await client.get(url, timeout=10.0)
            
            if response.status_code != 200:
                return []
                
            data = response.json()
            results = data.get("results", [])
            if not results:
                return []
                
            res = results[0]
            interactions_text = res.get("drug_interactions", [""])[0]
            if not interactions_text:
                return []
                
            # Basic parsing approach
            import re
            segments = re.split(r'[,;\n.]', interactions_text)
            
            # This is a highly simplified heuristic for finding drug names in text
            # In a real app, this would use an NER model or a comprehensive drug dictionary
            mentioned = []
            seen = set()
            
            # Some common non-drug words to filter out
            common_words = {"the", "and", "or", "of", "to", "in", "a", "is", "with", "patients", "treatment", "may", "be", "by", "as", "for", "on", "are", "these", "this"}
            
            for segment in segments:
                segment = segment.strip()
                if not segment or len(segment) < 4:
                    continue
                    
                words = segment.split()
                # Looking for relatively long words that might be drug names
                possible_drugs = [w.lower().strip('()""''') for w in words if len(w) > 4 and w.lower() not in common_words]
                
                for pd in possible_drugs:
                    # Simple heuristic: if it ends in common drug suffixes
                    if pd.endswith("in") or pd.endswith("ol") or pd.endswith("ide") or pd.endswith("pam"):
                        if pd not in seen and pd != drug_name.lower():
                            seen.add(pd)
                            mentioned.append({
                                "mentioned_drug": pd.capitalize(),
                                "context": segment[:200],
                                "source": "OpenFDA Label"
                            })
                            if len(mentioned) >= 10:
                                return mentioned
            
            return mentioned
    except Exception:
        return []

async def search_drug_openfda(query: str) -> List[str]:
    """
    Searches for drugs matching the query.
    """
    if len(query) < 2:
        return []
        
    try:
        async with httpx.AsyncClient() as client:
            url = f"{BASE_URL}/label.json?search=openfda.generic_name:{query}*&limit=8"
            response = await client.get(url, timeout=10.0)
            
            results = []
            if response.status_code == 200:
                data = response.json()
                results = data.get("results", [])
                
            # If we don't have enough generic matches, try brand names
            if len(results) < 3:
                brand_url = f"{BASE_URL}/label.json?search=openfda.brand_name:{query}*&limit=8"
                brand_response = await client.get(brand_url, timeout=10.0)
                if brand_response.status_code == 200:
                    brand_data = brand_response.json()
                    results.extend(brand_data.get("results", []))
            
            # Extract distinctive names
            drugs = []
            for r in results:
                openfda = r.get("openfda", {})
                generics = openfda.get("generic_name", [])
                brands = openfda.get("brand_name", [])
                
                # Add first generic if available
                if generics:
                    drugs.append(generics[0])
                # Add first brand if available
                if brands:
                    drugs.append(brands[0])
            
            # Deduplicate while preserving order, case-insensitive logic but return original case
            seen_lower = set()
            unique_drugs = []
            for d in drugs:
                d_lower = d.lower()
                if d_lower not in seen_lower:
                    seen_lower.add(d_lower)
                    unique_drugs.append(d)
                    
            return unique_drugs[:10]
    except Exception:
        return []

async def get_drug_warnings(drug_name: str) -> Dict[str, Any]:
    """
    Extracts warning sections from the drug label.
    """
    try:
        async with httpx.AsyncClient() as client:
            url = f"{BASE_URL}/label.json?search=openfda.generic_name:\"{drug_name}\"&limit=1"
            response = await client.get(url, timeout=10.0)
            
            if response.status_code != 200:
                raise Exception("Not found")
                
            data = response.json()
            results = data.get("results", [])
            if not results:
                raise Exception("Empty results")
                
            res = results[0]
            
            boxed_warning = res.get("boxed_warning", [None])[0]
            warnings_and_precautions = res.get("warnings_and_precautions", [None])[0]
            adverse_reactions = res.get("adverse_reactions", [None])[0]
            
            if boxed_warning:
                boxed_warning = boxed_warning[:600]
            if warnings_and_precautions:
                warnings_and_precautions = warnings_and_precautions[:600]
            if adverse_reactions:
                adverse_reactions = adverse_reactions[:400]
                
            return {
                "boxed_warning": boxed_warning,
                "warnings_and_precautions": warnings_and_precautions,
                "adverse_reactions": adverse_reactions,
                "has_black_box_warning": bool(boxed_warning)
            }
    except Exception:
        return {
            "boxed_warning": None,
            "warnings_and_precautions": None,
            "adverse_reactions": None,
            "has_black_box_warning": False
        }

async def enrich_drug_list(drug_names: List[str]) -> List[Dict[str, Any]]:
    """
    Concurrently fetches OpenFDA data for a list of drugs.
    """
    tasks = [get_drug_label(drug) for drug in drug_names]
    results = await asyncio.gather(*tasks)
    return list(results)
