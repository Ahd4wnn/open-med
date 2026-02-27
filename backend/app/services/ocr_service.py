import base64
import httpx
import json
import io
from typing import Optional
from app.config import settings

# Cost optimization constants
# GPT-4o-mini vision: ~$0.00015 per image (low detail mode)
# We use low detail to minimize cost — enough for text extraction
IMAGE_DETAIL = "low"  
MAX_TOKENS = 400  # Drug list extraction needs very few tokens
MAX_PAGES = 2     # Only process first 2 pages — prescriptions 
                  # are usually 1 page

SYSTEM_PROMPT = """You are a prescription parser. 
Extract ONLY medication/drug names from the prescription image.
Return a JSON object with exactly this structure:
{
  "drugs": ["drug1", "drug2"],
  "confidence": "high" | "medium" | "low",
  "notes": "brief note if any"
}
Rules:
- Return generic names in lowercase when possible
- Include brand names if generic is unclear
- Do NOT include dosages, frequencies, or instructions
- If no drugs found, return {"drugs": [], "confidence": "low"}
- Return ONLY valid JSON, no other text"""

async def pdf_to_images_base64(
    pdf_bytes: bytes
) -> list[str]:
    """
    Convert PDF pages to base64 images using pypdf + pillow.
    Returns list of base64 encoded PNG strings.
    Cost optimization: max MAX_PAGES pages, 
    resize to 800px width to reduce token usage.
    """
    try:
        import pypdf
        from PIL import Image
        import fitz  # PyMuPDF

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        images = []

        for page_num in range(min(len(doc), MAX_PAGES)):
            page = doc[page_num]
            
            # Render at 150 DPI — enough for text, 
            # not too large for API
            mat = fitz.Matrix(150/72, 150/72)
            pix = page.get_pixmap(matrix=mat)
            
            img_data = pix.tobytes("png")
            
            # Resize to max 800px width to minimize 
            # token cost while keeping text readable
            img = Image.open(io.BytesIO(img_data))
            if img.width > 800:
                ratio = 800 / img.width
                new_height = int(img.height * ratio)
                img = img.resize(
                    (800, new_height), 
                    Image.LANCZOS
                )
            
            # Convert back to bytes
            buffer = io.BytesIO()
            img.save(buffer, format="PNG", optimize=True)
            buffer.seek(0)
            
            b64 = base64.b64encode(
                buffer.read()
            ).decode("utf-8")
            images.append(b64)

        doc.close()
        return images

    except Exception as e:
        print(f"PDF conversion error: {e}")
        return []

async def extract_drugs_with_openai(
    image_base64: str
) -> Optional[dict]:
    """
    Use GPT-4o-mini vision to extract drug names.
    Cost optimized: low detail mode, minimal tokens.
    Estimated cost per call: ~$0.001-0.002
    """
    if not settings.OPENAI_API_KEY:
        return None

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": 
                        f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [
                        {
                            "role": "system",
                            "content": SYSTEM_PROMPT
                        },
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/png;base64,{image_base64}",
                                        # LOW detail = 
                                        # ~85 tokens per image
                                        # vs high = 1000+ tokens
                                        "detail": IMAGE_DETAIL
                                    }
                                },
                                {
                                    "type": "text",
                                    "text": "Extract all medication names from this prescription. Return only JSON."
                                }
                            ]
                        }
                    ],
                    # Keep tokens minimal — 
                    # just need a drug list
                    "max_tokens": MAX_TOKENS,
                    "temperature": 0.0  # Deterministic output
                }
            )

            if response.status_code != 200:
                print(f"OpenAI OCR error: {response.text}")
                return None

            data = response.json()
            content = data["choices"][0]["message"]["content"]

            # Log estimated cost
            tokens_used = data.get("usage", {})
            input_tokens = tokens_used.get(
                "prompt_tokens", 0
            )
            output_tokens = tokens_used.get(
                "completion_tokens", 0
            )
            # GPT-4o-mini pricing:
            # $0.00015/1K input, $0.0006/1K output
            cost = (input_tokens * 0.00015 / 1000 + 
                   output_tokens * 0.0006 / 1000)
            print(f"OCR cost: ${cost:.5f} "
                  f"({input_tokens} in, "
                  f"{output_tokens} out tokens)")

            # Parse JSON response
            cleaned = content.strip()
            if "```" in cleaned:
                parts = cleaned.split("```")
                for part in parts:
                    if "{" in part:
                        cleaned = part.replace(
                            "json", ""
                        ).strip()
                        break

            result = json.loads(cleaned)
            return result

    except json.JSONDecodeError as e:
        print(f"OpenAI OCR JSON parse error: {e}")
        print(f"Raw response: {content}")
        return None
    except Exception as e:
        print(f"OpenAI OCR error: {e}")
        return None

def extract_drugs_with_patterns(text: str) -> list[str]:
    """
    Fallback: Pattern-based drug extraction from raw text.
    Used when both OpenAI and Tesseract are unavailable.
    """
    KNOWN_DRUGS = [
        "warfarin", "aspirin", "metformin", "lisinopril",
        "metoprolol", "simvastatin", "atorvastatin",
        "amlodipine", "omeprazole", "amiodarone", "digoxin",
        "fluconazole", "ibuprofen", "clopidogrel", "lithium",
        "phenytoin", "methotrexate", "furosemide",
        "levothyroxine", "sertraline", "fluoxetine",
        "escitalopram", "alprazolam", "lorazepam", "diazepam",
        "tramadol", "gabapentin", "pregabalin", "losartan",
        "valsartan", "ramipril", "bisoprolol", "carvedilol",
        "rosuvastatin", "pravastatin", "pantoprazole",
        "ciprofloxacin", "azithromycin", "amoxicillin",
        "doxycycline", "metronidazole", "clarithromycin",
        "insulin", "glipizide", "sitagliptin", "rivaroxaban",
        "apixaban", "dabigatran", "atenolol", "nifedipine",
        "acetaminophen", "naproxen", "celecoxib", "prednisone",
        "allopurinol", "colchicine", "hydroxychloroquine",
        "spironolactone", "hydrochlorothiazide"
    ]

    ALIASES = {
        "advil": "ibuprofen", "motrin": "ibuprofen",
        "tylenol": "acetaminophen", "coumadin": "warfarin",
        "glucophage": "metformin", "lipitor": "atorvastatin",
        "crestor": "rosuvastatin", "norvasc": "amlodipine",
        "lopressor": "metoprolol", "prinivil": "lisinopril",
        "zestril": "lisinopril", "plavix": "clopidogrel",
        "lasix": "furosemide", "synthroid": "levothyroxine",
        "zoloft": "sertraline", "prozac": "fluoxetine",
        "nexium": "esomeprazole", "prilosec": "omeprazole",
        "zithromax": "azithromycin"
    }

    text_lower = text.lower()
    found = set()

    for drug in KNOWN_DRUGS:
        import re
        pattern = r'\b' + re.escape(drug) + r'\b'
        if re.search(pattern, text_lower):
            found.add(drug)

    for alias, generic in ALIASES.items():
        import re
        pattern = r'\b' + re.escape(alias) + r'\b'
        if re.search(pattern, text_lower):
            found.add(generic)

    return list(found)

async def extract_drugs_from_pdf(
    pdf_bytes: bytes
) -> dict:
    """
    Main OCR pipeline:
    1. Convert PDF to images
    2. Try OpenAI Vision (primary — most accurate)
    3. Signal frontend to use Tesseract (fallback)
    4. Pattern matching on any available text
    """
    result = {
        "drugs_found": [],
        "confidence": "low",
        "pages_processed": 0,
        "method_used": "none",
        "use_tesseract_fallback": False,
        "notes": ""
    }

    # Step 1: Convert PDF to images
    images = await pdf_to_images_base64(pdf_bytes)

    if not images:
        result["notes"] = (
            "Could not process PDF. "
            "Please ensure the file is not corrupted."
        )
        result["use_tesseract_fallback"] = True
        return result

    result["pages_processed"] = len(images)

    # Step 2: Try OpenAI Vision (primary)
    if settings.OPENAI_API_KEY:
        all_drugs = set()
        highest_confidence = "low"

        for i, img_b64 in enumerate(images):
            print(f"Processing page {i+1} with OpenAI...")
            ai_result = await extract_drugs_with_openai(
                img_b64
            )

            if ai_result and ai_result.get("drugs"):
                drugs = [
                    d.lower().strip() 
                    for d in ai_result["drugs"]
                    if d and len(d) > 2
                ]
                all_drugs.update(drugs)

                conf = ai_result.get("confidence", "low")
                if conf == "high":
                    highest_confidence = "high"
                elif (conf == "medium" and 
                      highest_confidence == "low"):
                    highest_confidence = "medium"

                if ai_result.get("notes"):
                    result["notes"] = ai_result["notes"]

        if all_drugs:
            result["drugs_found"] = list(all_drugs)
            result["confidence"] = highest_confidence
            result["method_used"] = "openai_vision"
            return result

        print("OpenAI returned no drugs, "
              "flagging for Tesseract fallback")

    # Step 3: Signal frontend to use Tesseract
    # Send back the images as base64 for browser processing
    result["use_tesseract_fallback"] = True
    result["images_base64"] = images  
    result["method_used"] = "tesseract_fallback"
    result["notes"] = (
        "OpenAI unavailable — using browser OCR"
    )
    return result
