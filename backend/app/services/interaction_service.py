import asyncio
import itertools
from app.services.drug_data import (
    DRUG_INTERACTIONS,
    normalize_drug_name,
    get_local_interaction
)
from app.services.openai_service import analyze_drug_interactions_ai
from app.services.openfda_service import enrich_drug_list
from app.services.rxnav_service import search_drug_suggestions
from app.services.openfda_service import search_drug_openfda

def check_interactions_local(drug_names: list[str]) -> list[dict]:
    normalized = [normalize_drug_name(d) for d in drug_names]
    results = []
    seen = set()
    for drug_a, drug_b in itertools.combinations(normalized, 2):
        pair = frozenset({drug_a, drug_b})
        if pair in seen:
            continue
        seen.add(pair)
        interaction = get_local_interaction(drug_a, drug_b)
        if interaction:
            results.append(interaction)
    return results

async def analyze_drugs(drug_names: list[str]) -> dict:
    normalized = [normalize_drug_name(d) for d in drug_names]

    # Run local check + OpenAI + FDA enrichment concurrently
    local_interactions = check_interactions_local(normalized)
    local_pairs = {
        frozenset({i["drug_1"], i["drug_2"]})
        for i in local_interactions
    }

    # PRIMARY: OpenAI analysis
    ai_interactions = await analyze_drug_interactions_ai(normalized)

    # Merge — local takes priority for duplicates
    ai_new = [
        i for i in ai_interactions
        if frozenset({i["drug_1"], i["drug_2"]}) not in local_pairs
    ]

    all_interactions = local_interactions + ai_new

    # Sort by severity weight descending
    all_interactions.sort(
        key=lambda x: x.get("risk_score_weight", 0),
        reverse=True
    )

    # Get drug metadata from OpenFDA concurrently
    drug_metadata = await enrich_drug_list(normalized)

    # Build severity summary
    severity_summary = {
        "contraindicated": 0,
        "major": 0,
        "moderate": 0,
        "minor": 0
    }
    for i in all_interactions:
        sev = i.get("severity", "minor")
        if sev in severity_summary:
            severity_summary[sev] += 1

    highest = "none"
    for sev in ["contraindicated", "major", "moderate", "minor"]:
        if severity_summary[sev] > 0:
            highest = sev
            break

    sources = list(set(
        i.get("source", "OpenMed Database")
        for i in all_interactions
    ))
    if not sources:
        sources = ["OpenMed Local Database"]

    return {
        "drugs_analyzed": normalized,
        "drug_metadata": drug_metadata,
        "total_interactions": len(all_interactions),
        "interactions": all_interactions,
        "severity_summary": severity_summary,
        "highest_severity": highest,
        "data_sources": sources
    }
