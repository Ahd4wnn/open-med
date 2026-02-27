import httpx
import json
from typing import Dict, Any, Optional
from app.config import settings
import logging

logger = logging.getLogger(__name__)

async def generate_cot_risk_explanation(
    risk_breakdown: Dict[str, Any],
    interaction_result: Dict[str, Any],
    patient_profile: Optional[object] = None
) -> Dict[str, Any]:
    """
    Calls Featherless.ai to generate a 5-step Chain-of-Thought clinical reasoning.
    """
    if not settings.FEATHERLESS_API_KEY:
        logger.warning("FEATHERLESS_API_KEY not set. Returning empty CoT explanation.")
        return {"steps": [], "error": "API Key not configured", "raw_response": ""}

    # Extract patient data
    age = "Not provided"
    egfr = "Not provided"
    liver_score = "Not provided"
    
    if patient_profile:
        age = str(getattr(patient_profile, "age", "Not provided"))
        egfr = str(getattr(patient_profile, "egfr", "Not provided"))
        liver_score = str(getattr(patient_profile, "liver_score", "Not provided"))

    # Extract risk data
    count = risk_breakdown.get("total_medications", 0)
    final_score = risk_breakdown.get("final_score", 0)
    risk_category = interaction_result.get("final_risk_category", "Unknown")
    
    # Format interactions
    interactions_text = ""
    for idx, interaction in enumerate(interaction_result.get("interactions", [])):
        d1 = interaction.get("drug1", "")
        d2 = interaction.get("drug2", "")
        sev = interaction.get("severity", "Unknown")
        desc = interaction.get("description", "No description available.")
        interactions_text += f"- {d1} + {d2}: {sev} — {desc}\n"
        if idx >= 4: # Cap to top 5 to avoid token limits
            interactions_text += "- ...and more minor interactions not listed here.\n"
            break
            
    if not interactions_text:
        interactions_text = "No known interactions detected."

    # Format clinical flags
    flags_text = "\n".join([f"- {flag}" for flag in interaction_result.get("clinical_flags", [])])
    if not flags_text:
        flags_text = "No active clinical flags."

    system_prompt = """You are a senior clinical pharmacist providing a chain-of-thought analysis of a patient's medication risk assessment. You must reason step by step through the clinical implications. Be clear, precise, and evidence-based. Structure your response in exactly 5 clearly labeled steps:
Step 1: Assess the most dangerous interaction and why
Step 2: Explain how patient parameters amplify or reduce the risk
Step 3: Identify the primary driver of the overall risk score
Step 4: Suggest the most important clinical action
Step 5: Provide a plain-English summary for the patient"""

    user_prompt = f"""Analyze the following medication risk assessment using chain-of-thought reasoning:

PATIENT PARAMETERS:
- Age: {age}
- eGFR (Kidney function): {egfr}
- Liver function score: {liver_score}
- Number of medications: {count}

DETECTED INTERACTIONS:
{interactions_text}

RISK SCORE: {final_score}/100 — Category: {risk_category}

CLINICAL FLAGS:
{flags_text}

Please reason through:
Step 1: Assess the most dangerous interaction and why
Step 2: Explain how patient parameters amplify or reduce the risk
Step 3: Identify the primary driver of the overall risk score
Step 4: Suggest the most important clinical action
Step 5: Provide a plain-English summary for the patient

Be specific, cite the pharmacological mechanisms, and keep each step to 2-3 sentences."""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = {
                "Authorization": f"Bearer {settings.FEATHERLESS_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": settings.FEATHERLESS_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "max_tokens": 1000,
                "temperature": 0.3
            }
            
            response = await client.post(
                f"{settings.FEATHERLESS_BASE_URL.rstrip('/')}/chat/completions",
                headers=headers,
                json=payload
            )
            
            if response.status_code != 200:
                logger.error(f"Featherless API Error: {response.text}")
                return {"steps": [], "error": "AI Service unavailable", "raw_response": ""}
                
            data = response.json()
            raw_text = data["choices"][0]["message"]["content"]
            
            # Simple parsing of the 5 steps
            steps = []
            import re
            
            # Use regex to find Step X: pattern
            pattern = re.compile(r'Step (\d+):?\s*([^\n]+)?\n(.*?)(?=Step \d+:|$)', re.DOTALL | re.IGNORECASE)
            matches = pattern.findall(raw_text)
            
            labels = {
                1: "Most Dangerous Interaction",
                2: "Patient Parameter Impact",
                3: "Primary Risk Driver",
                4: "Clinical Action",
                5: "Patient Summary"
            }
            
            if matches:
                for match in matches:
                    step_num = int(match[0])
                    # Sometimes the model includes the title on the same line, sometimes it doesn't
                    # We'll use our forced labels to be safe
                    content = match[2].strip()
                    if step_num in labels:
                        steps.append({
                            "step": step_num,
                            "title": labels[step_num],
                            "content": content
                        })
            else:
                # Fallback if regex parsing fails
                steps = [{"step": 1, "title": "Analysis", "content": raw_text}]
                
            return {
                "steps": steps,
                "raw_response": raw_text,
                "model_used": settings.FEATHERLESS_MODEL
            }
            
    except Exception as e:
        logger.error(f"CoT Generation Error: {str(e)}")
        return {"steps": [], "error": str(e), "raw_response": ""}

async def generate_drug_enrichment_summary(drug_name: str, fda_data: Dict[str, Any]) -> str:
    """
    Summarizes dense FDA label data into a concise clinical snapshot.
    """
    if not settings.FEATHERLESS_API_KEY:
        return ""
        
    system_prompt = "You are a clinical pharmacist. Provide a concise, accurate drug summary."
    
    # Trim FDA data to avoid token limits
    trimmed_data = json.dumps(fda_data, indent=2)[:1000]
    
    user_prompt = f"""Summarize the key clinical information for {drug_name} based on this FDA label data. Focus on: main use, key warnings, and most important drug interactions to watch for. Keep it under 100 words.

FDA Data: {trimmed_data}"""

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            headers = {
                "Authorization": f"Bearer {settings.FEATHERLESS_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": settings.FEATHERLESS_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "max_tokens": 200,
                "temperature": 0.2
            }
            
            response = await client.post(
                f"{settings.FEATHERLESS_BASE_URL.rstrip('/')}/chat/completions",
                headers=headers,
                json=payload
            )
            
            if response.status_code == 200:
                data = response.json()
                return data["choices"][0]["message"]["content"].strip()
            return ""
    except Exception as e:
        logger.error(f"FDA Summary Error: {str(e)}")
        return ""
