import httpx
import json
from app.config import settings

FEATHERLESS_BASE = "https://api.featherless.ai/v1"

RESEARCH_MODEL = "deepseek-ai/DeepSeek-R1-0528"

async def _call_featherless(
    messages: list[dict],
    model: str = None,
    temperature: float = 0.2,
    max_tokens: int = 1500
) -> str:
    if not settings.FEATHERLESS_API_KEY:
        return ""
    try:
        async with httpx.AsyncClient(timeout=45) as client:
            r = await client.post(
                f"{FEATHERLESS_BASE}/chat/completions",
                headers={
                    "Authorization": 
                        f"Bearer {settings.FEATHERLESS_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model or RESEARCH_MODEL,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens
                }
            )
            if r.status_code != 200:
                print(f"Featherless error: {r.status_code} {r.text}")
                return ""
            data = r.json()
            content = data["choices"][0]["message"]["content"]
            # Strip <think> tags if present (DeepSeek R1 reasoning)
            if "<think>" in content:
                if "</think>" in content:
                    content = content.split("</think>")[-1].strip()
            return content
    except Exception as e:
        print(f"Featherless error: {e}")
        return ""

async def generate_deep_research_analysis(
    drug_names: list[str],
    interaction_result: dict
) -> dict:
    """
    Deep research analysis using DeepSeek R1 on Featherless.
    This model does extended reasoning — takes longer but 
    produces thorough clinical analysis.
    """
    interactions = interaction_result.get("interactions", [])
    severity_summary = interaction_result.get(
        "severity_summary", {}
    )

    interaction_text = "\n".join([
        f"- {i['drug_1']} + {i['drug_2']}: "
        f"{i['severity'].upper()} — {i['mechanism']}"
        for i in interactions[:8]
    ]) or "No interactions detected"

    system = """You are a senior clinical pharmacologist with 
expertise in polypharmacy and drug safety. Perform a thorough, 
evidence-based analysis of drug combinations. Consider:
- Pharmacokinetic interactions (absorption, distribution, 
  metabolism, excretion)
- Pharmacodynamic interactions (additive, synergistic, antagonistic)
- CYP450 enzyme system effects
- Clinical significance and real-world risk
- Evidence quality and clinical guidelines
Be thorough, specific, and cite mechanisms clearly."""

    user = f"""Perform a deep clinical analysis of this 
drug combination: {", ".join(drug_names)}

DETECTED INTERACTIONS:
{interaction_text}

SEVERITY SUMMARY:
- Contraindicated: {severity_summary.get('contraindicated', 0)}
- Major: {severity_summary.get('major', 0)}
- Moderate: {severity_summary.get('moderate', 0)}
- Minor: {severity_summary.get('minor', 0)}

Provide:
1. PHARMACOKINETIC ANALYSIS: How do these drugs affect each 
   other's absorption, metabolism and clearance?
2. PHARMACODYNAMIC ANALYSIS: What are the combined effects 
   on the body's systems?
3. HIGHEST RISK CONCERN: What is the single most dangerous 
   aspect of this combination and why?
4. MONITORING PARAMETERS: What specific lab values or symptoms 
   should be monitored?
5. CLINICAL BOTTOM LINE: One paragraph summary for a physician.

Be specific with mechanisms, enzymes, and clinical evidence."""

    response = await _call_featherless(
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user}
        ],
        model=RESEARCH_MODEL,
        temperature=0.2,
        max_tokens=1500
    )

    if not response:
        return {
            "analysis": "",
            "model_used": RESEARCH_MODEL,
            "error": "Deep research unavailable"
        }

    # Parse sections
    sections = {}
    section_keys = [
        ("pharmacokinetic", "PHARMACOKINETIC ANALYSIS"),
        ("pharmacodynamic", "PHARMACODYNAMIC ANALYSIS"),
        ("highest_risk", "HIGHEST RISK CONCERN"),
        ("monitoring", "MONITORING PARAMETERS"),
        ("clinical_bottom_line", "CLINICAL BOTTOM LINE")
    ]

    for key, header in section_keys:
        if header in response.upper():
            parts = response.upper().split(header)
            if len(parts) > 1:
                raw_section = response[
                    response.upper().index(header) + len(header):
                ]
                next_headers = [h for _, h in section_keys 
                               if h != header]
                end_idx = len(raw_section)
                for nh in next_headers:
                    idx = raw_section.upper().find(nh)
                    if idx != -1 and idx < end_idx:
                        end_idx = idx
                sections[key] = raw_section[:end_idx].strip(
                    ": \n"
                ).strip()

    return {
        "full_analysis": response,
        "sections": sections,
        "model_used": RESEARCH_MODEL,
        "drug_count": len(drug_names),
        "interaction_count": len(interactions)
    }

async def generate_drug_enrichment_summary(
    drug_name: str,
    fda_data: dict
) -> str:
    response = await _call_featherless(
        messages=[
            {
                "role": "system",
                "content": "You are a clinical pharmacist. Give concise drug summaries under 80 words."
            },
            {
                "role": "user",
                "content": f"Summarize {drug_name} clinically: main use, key warnings, critical interactions. FDA data: {str(fda_data)[:500]}"
            }
        ],
        temperature=0.1,
        max_tokens=120
    )
    return response
