import httpx
import json
import asyncio
from typing import Optional
from app.config import settings

OPENAI_BASE = "https://api.openai.com/v1"

async def _call_openai(
    messages: list[dict],
    temperature: float = 0.1,
    max_tokens: int = 1500
) -> Optional[str]:
    if not settings.OPENAI_API_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                f"{OPENAI_BASE}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": settings.OPENAI_MODEL,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens
                }
            )
            if r.status_code != 200:
                return None
            data = r.json()
            return data["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"OpenAI error: {e}")
        return None

async def analyze_drug_interactions_ai(
    drug_names: list[str]
) -> list[dict]:
    """
    Use GPT-4o-mini to analyze drug interactions.
    Returns structured list of interactions.
    """
    system_prompt = """You are a clinical pharmacologist. 
Analyze drug-drug interactions and return ONLY a valid JSON array.
Each interaction object must have exactly these fields:
- drug_1: string (lowercase)
- drug_2: string (lowercase)  
- severity: string (exactly one of: "contraindicated", "major", "moderate", "minor")
- mechanism: string (pharmacological explanation, max 200 chars)
- recommendation: string (clinical action, max 150 chars)
- risk_score_weight: number (contraindicated=6.0, major=4.0, moderate=2.5, minor=1.0)
- source: "OpenAI Clinical Analysis"

Return ONLY the JSON array, no other text.
If no interactions exist between any pair, return an empty array [].
Be accurate and evidence-based."""

    user_prompt = f"""Analyze ALL drug-drug interactions between these medications: {", ".join(drug_names)}

Check every possible pair combination.
Return a JSON array of all clinically significant interactions found."""

    response = await _call_openai(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.1,
        max_tokens=2000
    )

    if not response:
        return []

    try:
        # Clean response — remove markdown if present
        cleaned = response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        cleaned = cleaned.strip()

        interactions = json.loads(cleaned)
        if not isinstance(interactions, list):
            return []

        # Validate and normalize each interaction
        valid = []
        valid_severities = {
            "contraindicated", "major", "moderate", "minor"
        }
        weight_map = {
            "contraindicated": 6.0,
            "major": 4.0,
            "moderate": 2.5,
            "minor": 1.0
        }
        for item in interactions:
            if not isinstance(item, dict):
                continue
            severity = item.get("severity", "moderate").lower()
            if severity not in valid_severities:
                severity = "moderate"
            valid.append({
                "drug_1": str(item.get("drug_1", "")).lower(),
                "drug_2": str(item.get("drug_2", "")).lower(),
                "severity": severity,
                "mechanism": str(item.get("mechanism", ""))[:300],
                "recommendation": str(
                    item.get("recommendation", 
                             "Consult your physician.")
                )[:200],
                "risk_score_weight": weight_map[severity],
                "source": "OpenAI Clinical Analysis"
            })
        return valid
    except Exception as e:
        print(f"OpenAI parse error: {e}")
        return []

async def get_drug_summary_ai(drug_name: str) -> str:
    """Get a concise clinical summary for a drug."""
    response = await _call_openai(
        messages=[
            {
                "role": "system",
                "content": "You are a clinical pharmacist. Give concise, accurate drug summaries."
            },
            {
                "role": "user",
                "content": f"Give a 2-sentence clinical summary of {drug_name}: main use and most important safety consideration."
            }
        ],
        temperature=0.1,
        max_tokens=150
    )
    return response or ""

async def generate_cot_explanation_openai(
    risk_breakdown: dict,
    interaction_result: dict,
    patient_profile=None
) -> dict:
    """
    Chain-of-thought clinical explanation using OpenAI.
    Used as primary or fallback for Featherless.
    """
    interactions = interaction_result.get("interactions", [])
    score = risk_breakdown.get("final_score", 0)
    category = risk_breakdown.get("risk_category", "Unknown")
    flags = risk_breakdown.get("clinical_flags", [])

    age = None
    egfr = None
    liver = None
    if patient_profile:
        age = getattr(patient_profile, "age", None)
        egfr = getattr(patient_profile, "egfr", None)
        liver = getattr(patient_profile, "liver_score", None)

    interaction_text = "\n".join([
        f"- {i['drug_1']} + {i['drug_2']}: "
        f"{i['severity']} — {i['mechanism']}"
        for i in interactions[:5]
    ]) or "None detected"

    flags_text = "\n".join(flags[:5]) or "None"

    system = """You are a senior clinical pharmacist providing 
a chain-of-thought medication safety analysis. 
Structure your response with exactly these 5 labeled steps:
Step 1: Most Dangerous Interaction
Step 2: Patient Parameter Impact  
Step 3: Primary Risk Driver
Step 4: Recommended Clinical Action
Step 5: Plain English Patient Summary
Keep each step to 2-3 sentences. Be specific and clinical."""

    user = f"""Analyze this medication risk assessment:

RISK SCORE: {score}/100 — {category}
AGE: {age or 'Not provided'}
eGFR: {egfr or 'Not provided'}
LIVER SCORE: {liver or 'Not provided'}

INTERACTIONS:
{interaction_text}

CLINICAL FLAGS:
{flags_text}

Provide your 5-step chain-of-thought analysis."""

    response = await _call_openai(
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user}
        ],
        temperature=0.2,
        max_tokens=800
    )

    if not response:
        return {
            "steps": [],
            "error": "AI explanation unavailable",
            "raw_response": ""
        }

    # Parse steps
    steps_data = []
    step_titles = [
        "Most Dangerous Interaction",
        "Patient Parameter Impact",
        "Primary Risk Driver",
        "Recommended Clinical Action",
        "Plain English Patient Summary"
    ]

    parts = response.split("Step ")
    for i, title in enumerate(step_titles, 1):
        content = ""
        for part in parts:
            if part.startswith(str(i)):
                lines = part.split("\n", 1)
                content = lines[1].strip() if len(lines) > 1 else ""
                content = content.replace(
                    f"{i}:", ""
                ).strip()
                break
        steps_data.append({
            "step": i,
            "title": title,
            "content": content or "Analysis not available."
        })

    return {
        "steps": steps_data,
        "raw_response": response,
        "model_used": settings.OPENAI_MODEL
    }

async def suggest_drug_alternatives_ai(
    drug_name: str,
    interaction_context: str
) -> list[dict]:
    """Suggest safer alternatives for a problematic drug."""
    response = await _call_openai(
        messages=[
            {
                "role": "system",
                "content": """You are a clinical pharmacologist. 
Return ONLY a JSON array of safer drug alternatives.
Each object: {"name": string, "reason": string, "drug_class": string}
Max 3 alternatives. Return only the JSON array."""
            },
            {
                "role": "user",
                "content": f"Suggest safer alternatives to {drug_name} given this interaction concern: {interaction_context}"
            }
        ],
        temperature=0.1,
        max_tokens=300
    )

    if not response:
        return []

    try:
        cleaned = response.strip()
        if "```" in cleaned:
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        return json.loads(cleaned.strip())
    except Exception:
        return []
