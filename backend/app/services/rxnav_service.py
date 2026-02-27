import httpx
import asyncio
from typing import Optional
from app.config import settings

RXNAV_BASE = "https://rxnav.nlm.nih.gov/REST"

async def get_rxcui(drug_name: str) -> Optional[str]:
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(
                f"{RXNAV_BASE}/rxcui.json",
                params={"name": drug_name, "search": 1}
            )
            data = r.json()
            ids = (data.get("idGroup", {})
                      .get("rxnormId", []))
            return ids[0] if ids else None
    except Exception:
        return None

async def search_drug_suggestions(query: str) -> list[str]:
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(
                f"{RXNAV_BASE}/spellingsuggestions.json",
                params={"name": query}
            )
            data = r.json()
            suggestions = (data.get("suggestionGroup", {})
                              .get("suggestionList", {})
                              .get("suggestion", []))
            return suggestions[:10] if suggestions else []
    except Exception:
        return []

async def get_drug_classes(rxcui: str) -> list[str]:
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(
                f"{RXNAV_BASE}/rxclass/class/byRxcui.json",
                params={"rxcui": rxcui}
            )
            data = r.json()
            items = (data.get("rxclassDrugInfoList", {})
                        .get("rxclassDrugInfo", []))
            classes = list(set(
                i["rxclassMinConceptItem"]["className"]
                for i in items
                if "rxclassMinConceptItem" in i
            ))
            return classes[:5]
    except Exception:
        return []

async def get_related_drugs(rxcui: str) -> list[str]:
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(
                f"{RXNAV_BASE}/rxcui/{rxcui}/related.json",
                params={"tty": "IN+BN"}
            )
            data = r.json()
            groups = (data.get("relatedGroup", {})
                         .get("conceptGroup", []))
            names = []
            for g in groups:
                for prop in g.get("conceptProperties", []):
                    if prop.get("name"):
                        names.append(prop["name"].lower())
            return names[:8]
    except Exception:
        return []
