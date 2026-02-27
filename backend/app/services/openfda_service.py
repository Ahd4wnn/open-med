import httpx
import asyncio
from typing import Optional

OPENFDA_BASE = "https://api.fda.gov/drug"

async def get_drug_label(drug_name: str) -> dict:
    try:
        async with httpx.AsyncClient(
            timeout=10, verify=False
        ) as client:
            r = await client.get(
                f"{OPENFDA_BASE}/label.json",
                params={
                    "search": f'openfda.generic_name:"{drug_name}"',
                    "limit": 1
                }
            )
            if r.status_code != 200:
                r = await client.get(
                    f"{OPENFDA_BASE}/label.json",
                    params={
                        "search": f'openfda.brand_name:"{drug_name}"',
                        "limit": 1
                    }
                )
            if r.status_code != 200:
                return _empty_label(drug_name)

            data = r.json()
            results = data.get("results", [])
            if not results:
                return _empty_label(drug_name)

            res = results[0]
            openfda = res.get("openfda", {})

            return {
                "drug_name": drug_name,
                "generic_name": (openfda.get("generic_name", [drug_name])[0]),
                "brand_names": openfda.get("brand_name", []),
                "drug_class": openfda.get("pharm_class_epc", []),
                "manufacturer": (openfda.get("manufacturer_name", 
                                            ["Unknown"])[0]),
                "warnings": (res.get("warnings", [""])[0])[:500],
                "contraindications": (res.get("contraindications", 
                                             [""])[0])[:500],
                "drug_interactions_text": (res.get("drug_interactions", 
                                                   [""])[0])[:800],
                "dosage_forms": openfda.get("dosage_form", []),
                "route": openfda.get("route", []),
                "purpose": (res.get("purpose", [""])[0])[:300],
                "source": "OpenFDA"
            }
    except Exception:
        return _empty_label(drug_name)

def _empty_label(drug_name: str) -> dict:
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
        "source": "OpenFDA"
    }

async def get_drug_warnings(drug_name: str) -> dict:
    try:
        async with httpx.AsyncClient(
            timeout=10, verify=False
        ) as client:
            r = await client.get(
                f"{OPENFDA_BASE}/label.json",
                params={
                    "search": f'openfda.generic_name:"{drug_name}"',
                    "limit": 1
                }
            )
            if r.status_code != 200:
                return _empty_warnings()
            data = r.json()
            results = data.get("results", [])
            if not results:
                return _empty_warnings()
            res = results[0]
            boxed = res.get("boxed_warning", [None])[0]
            return {
                "boxed_warning": boxed[:600] if boxed else None,
                "warnings_and_precautions": (
                    res.get("warnings_and_precautions", 
                           [None])[0] or ""
                )[:600],
                "adverse_reactions": (
                    res.get("adverse_reactions", 
                           [None])[0] or ""
                )[:400],
                "has_black_box_warning": boxed is not None
            }
    except Exception:
        return _empty_warnings()

def _empty_warnings() -> dict:
    return {
        "boxed_warning": None,
        "warnings_and_precautions": None,
        "adverse_reactions": None,
        "has_black_box_warning": False
    }

async def search_drug_openfda(query: str) -> list[str]:
    try:
        async with httpx.AsyncClient(
            timeout=8, verify=False
        ) as client:
            r = await client.get(
                f"{OPENFDA_BASE}/label.json",
                params={
                    "search": f"openfda.generic_name:{query}*",
                    "limit": 8
                }
            )
            if r.status_code != 200:
                return []
            data = r.json()
            names = []
            for result in data.get("results", []):
                openfda = result.get("openfda", {})
                for name in openfda.get("generic_name", []):
                    names.append(name.lower())
            return list(dict.fromkeys(names))[:10]
    except Exception:
        return []

async def enrich_drug_list(drug_names: list[str]) -> list[dict]:
    tasks = [get_drug_label(name) for name in drug_names]
    return await asyncio.gather(*tasks)
