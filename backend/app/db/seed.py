import asyncio
import json
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal
from app.models.user import User
from app.models.patient_profile import PatientProfile
from app.models.risk_assessment import RiskAssessment
from app.services.auth_service import hash_password
from datetime import datetime, timedelta
import random

DEMO_DOCTOR = {
    "email": "doctor@openmed.com",
    "password": "doctor123",
    "full_name": "Dr. Sarah Mitchell",
    "role": "doctor"
}

DEMO_PATIENTS = [
    {
        "email": "john.carter@email.com",
        "password": "patient123",
        "full_name": "John Carter",
        "role": "patient",
        "profile": {
            "age": 72,
            "weight_kg": 78.5,
            "egfr": 42.0,
            "liver_score": 2,
            "conditions": "Type 2 Diabetes, Hypertension, Heart Disease",
            "medications": "warfarin, metformin, lisinopril, aspirin, simvastatin"
        },
        "assessment": {
            "medications": ["warfarin", "metformin", "lisinopril", 
                          "aspirin", "simvastatin"],
            "risk_score": 78.4,
            "risk_category": "Severe",
            "interaction_count": 4,
            "breakdown": {
                "final_score": 78.4,
                "risk_category": "Severe",
                "base_interaction_score": 32.0,
                "multipliers": {
                    "age": {"value": 1.3, 
                           "explanation": "Elderly patient: reduced clearance"},
                    "kidney": {"value": 1.5, 
                              "explanation": "Moderate CKD Stage 3"},
                    "liver": {"value": 1.4, 
                             "explanation": "Mild liver dysfunction"},
                    "polypharmacy": {"value": 1.25, 
                                   "explanation": "5 medications"},
                    "combined": 3.4125
                },
                "clinical_flags": [
                    "HIGH RISK: Immediate clinical review recommended.",
                    "MAJOR INTERACTION: warfarin + aspirin — monitor INR closely",
                    "RENAL IMPAIRMENT: Renally-cleared drugs may accumulate."
                ],
                "recommendation": "HIGH RISK COMBINATION. Immediate medication review required."
            }
        }
    },
    {
        "email": "mary.johnson@email.com",
        "password": "patient123",
        "full_name": "Mary Johnson",
        "role": "patient",
        "profile": {
            "age": 65,
            "weight_kg": 62.0,
            "egfr": 58.0,
            "liver_score": 1,
            "conditions": "Hypertension, Atrial Fibrillation",
            "medications": "amiodarone, warfarin, digoxin, metoprolol"
        },
        "assessment": {
            "medications": ["amiodarone", "warfarin", "digoxin", "metoprolol"],
            "risk_score": 85.2,
            "risk_category": "Severe",
            "interaction_count": 5,
            "breakdown": {
                "final_score": 85.2,
                "risk_category": "Severe",
                "base_interaction_score": 45.0,
                "multipliers": {
                    "age": {"value": 1.3, 
                           "explanation": "Early elderly patient"},
                    "kidney": {"value": 1.2, 
                              "explanation": "Mildly reduced kidney function"},
                    "liver": {"value": 1.0, 
                             "explanation": "Normal liver function"},
                    "polypharmacy": {"value": 1.1, 
                                   "explanation": "4 medications"},
                    "combined": 1.716
                },
                "clinical_flags": [
                    "CONTRAINDICATED PAIR DETECTED: amiodarone + warfarin",
                    "HIGH RISK: Immediate clinical review recommended.",
                    "MAJOR INTERACTION: amiodarone + digoxin"
                ],
                "recommendation": "HIGH RISK COMBINATION. Immediate medication review required."
            }
        }
    },
    {
        "email": "robert.smith@email.com",
        "password": "patient123",
        "full_name": "Robert Smith",
        "role": "patient",
        "profile": {
            "age": 45,
            "weight_kg": 85.0,
            "egfr": 75.0,
            "liver_score": 1,
            "conditions": "Type 2 Diabetes",
            "medications": "metformin, omeprazole"
        },
        "assessment": {
            "medications": ["metformin", "omeprazole"],
            "risk_score": 18.5,
            "risk_category": "Low",
            "interaction_count": 0,
            "breakdown": {
                "final_score": 18.5,
                "risk_category": "Low",
                "base_interaction_score": 10.0,
                "multipliers": {
                    "age": {"value": 1.0, 
                           "explanation": "Adult age range"},
                    "kidney": {"value": 1.0, 
                              "explanation": "Normal kidney function"},
                    "liver": {"value": 1.0, 
                             "explanation": "Normal liver function"},
                    "polypharmacy": {"value": 1.0, 
                                   "explanation": "2 medications"},
                    "combined": 1.0
                },
                "clinical_flags": [],
                "recommendation": "Current medication combination appears relatively safe."
            }
        }
    },
    {
        "email": "linda.garcia@email.com",
        "password": "patient123",
        "full_name": "Linda Garcia",
        "role": "patient",
        "profile": {
            "age": 58,
            "weight_kg": 70.0,
            "egfr": 35.0,
            "liver_score": 3,
            "conditions": "Chronic Kidney Disease, Liver Cirrhosis, Depression",
            "medications": "lithium, ibuprofen, fluconazole, warfarin"
        },
        "assessment": {
            "medications": ["lithium", "ibuprofen", "fluconazole", "warfarin"],
            "risk_score": 95.0,
            "risk_category": "Severe",
            "interaction_count": 6,
            "breakdown": {
                "final_score": 95.0,
                "risk_category": "Severe",
                "base_interaction_score": 40.0,
                "multipliers": {
                    "age": {"value": 1.0, 
                           "explanation": "Adult age range"},
                    "kidney": {"value": 1.9, 
                              "explanation": "Severe CKD Stage 4"},
                    "liver": {"value": 2.0, 
                             "explanation": "Severe liver dysfunction"},
                    "polypharmacy": {"value": 1.1, 
                                   "explanation": "4 medications"},
                    "combined": 4.18
                },
                "clinical_flags": [
                    "HIGH RISK: Immediate clinical review recommended.",
                    "RENAL IMPAIRMENT: Drug accumulation risk.",
                    "HEPATIC IMPAIRMENT: CYP450 metabolism severely impaired.",
                    "MAJOR INTERACTION: lithium + ibuprofen",
                    "MAJOR INTERACTION: fluconazole + warfarin"
                ],
                "recommendation": "HIGH RISK COMBINATION. Immediate medication review required."
            }
        }
    },
    {
        "email": "james.wilson@email.com",
        "password": "patient123",
        "full_name": "James Wilson",
        "role": "patient",
        "profile": {
            "age": 38,
            "weight_kg": 92.0,
            "egfr": 88.0,
            "liver_score": 1,
            "conditions": "Hypertension",
            "medications": "amlodipine, lisinopril"
        },
        "assessment": {
            "medications": ["amlodipine", "lisinopril"],
            "risk_score": 22.0,
            "risk_category": "Low",
            "interaction_count": 1,
            "breakdown": {
                "final_score": 22.0,
                "risk_category": "Low",
                "base_interaction_score": 10.0,
                "multipliers": {
                    "age": {"value": 1.0, 
                           "explanation": "Adult age range"},
                    "kidney": {"value": 1.0, 
                              "explanation": "Normal kidney function"},
                    "liver": {"value": 1.0, 
                             "explanation": "Normal liver function"},
                    "polypharmacy": {"value": 1.0, 
                                   "explanation": "2 medications"},
                    "combined": 1.0
                },
                "clinical_flags": [],
                "recommendation": "Current medication combination appears relatively safe."
            }
        }
    }
]

async def seed():
    async with AsyncSessionLocal() as db:
        try:
            # Check if already seeded
            from sqlalchemy import select
            existing = await db.execute(
                select(User).where(User.email == DEMO_DOCTOR["email"])
            )
            if existing.scalar_one_or_none():
                print("✓ Database already seeded. Skipping.")
                return

            print("Seeding demo data...")

            # Create doctor
            doctor = User(
                email=DEMO_DOCTOR["email"],
                hashed_password=hash_password(DEMO_DOCTOR["password"]),
                full_name=DEMO_DOCTOR["full_name"],
                role=DEMO_DOCTOR["role"],
                is_active=True
            )
            db.add(doctor)
            await db.flush()
            print(f"✓ Created doctor: {doctor.email}")

            # Create patients with profiles and assessments
            for i, p_data in enumerate(DEMO_PATIENTS):
                patient = User(
                    email=p_data["email"],
                    hashed_password=hash_password(p_data["password"]),
                    full_name=p_data["full_name"],
                    role=p_data["role"],
                    is_active=True
                )
                db.add(patient)
                await db.flush()

                profile = PatientProfile(
                    user_id=patient.id,
                    **p_data["profile"]
                )
                db.add(profile)
                await db.flush()

                a = p_data["assessment"]
                assessment = RiskAssessment(
                    user_id=patient.id,
                    patient_profile_id=profile.id,
                    medications_analyzed=json.dumps(a["medications"]),
                    risk_score=a["risk_score"],
                    risk_category=a["risk_category"],
                    interaction_count=a["interaction_count"],
                    breakdown_json=json.dumps(a["breakdown"]),
                    created_at=datetime.utcnow() - timedelta(hours=i*3)
                )
                db.add(assessment)
                print(f"✓ Created patient: {patient.email} "
                      f"({a['risk_category']} risk)")

            await db.commit()
            print("\n✓ Seeding complete!")
            print("\nDemo Credentials:")
            print(f"Doctor: {DEMO_DOCTOR['email']} / {DEMO_DOCTOR['password']}")
            print("Patients: <email above> / patient123")

        except Exception as e:
            await db.rollback()
            print(f"✗ Seeding failed: {e}")
            raise

if __name__ == "__main__":
    asyncio.run(seed())
