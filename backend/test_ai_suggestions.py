import asyncio
import os
import sys

# Ensure app can be imported
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.rxnav_service import search_drug_suggestions
from app.services.ddinter_service import search_ddinter_drugs
from app.services.openfda_service import search_drug_openfda

async def test_search():
    q = "lisin"
    print(f"Searching for {q}...")

    try:
        rx = await search_drug_suggestions(q)
        print("RxNav:", rx)
    except Exception as e:
        print("RxNav Error:", e)

    try:
        dd = await search_ddinter_drugs(q)
        print("DDInter:", dd)
    except Exception as e:
        print("DDInter Error:", e)

    try:
        fda = await search_drug_openfda(q)
        print("OpenFDA:", fda)
    except Exception as e:
        print("OpenFDA Error:", e)

if __name__ == "__main__":
    asyncio.run(test_search())
