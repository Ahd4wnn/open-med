DRUG_INTERACTIONS = {
    frozenset(["warfarin", "aspirin"]): {
        "severity": "major",
        "mechanism": "Aspirin inhibits platelet aggregation and displaces warfarin from plasma proteins, significantly increasing bleeding risk.",
        "recommendation": "Avoid combination. If necessary, use lowest aspirin dose and monitor INR closely.",
        "risk_score_weight": 4.0
    },
    frozenset(["warfarin", "ibuprofen"]): {
        "severity": "major",
        "mechanism": "NSAIDs inhibit platelet function and can cause GI bleeding; ibuprofen also inhibits CYP2C9 increasing warfarin levels.",
        "recommendation": "Avoid. Use acetaminophen for pain relief instead.",
        "risk_score_weight": 4.0
    },
    frozenset(["warfarin", "metronidazole"]): {
        "severity": "major",
        "mechanism": "Metronidazole inhibits CYP2C9 and CYP3A4, significantly increasing warfarin plasma levels.",
        "recommendation": "Monitor INR closely. Reduce warfarin dose if needed.",
        "risk_score_weight": 4.0
    },
    frozenset(["warfarin", "amiodarone"]): {
        "severity": "contraindicated",
        "mechanism": "Amiodarone strongly inhibits CYP2C9 and CYP3A4, dramatically increasing warfarin effect and bleeding risk.",
        "recommendation": "Avoid combination. If unavoidable, reduce warfarin by 30-50% and monitor INR weekly.",
        "risk_score_weight": 6.0
    },
    frozenset(["metformin", "alcohol"]): {
        "severity": "moderate",
        "mechanism": "Alcohol potentiates metformin's effect on lactate metabolism, increasing lactic acidosis risk.",
        "recommendation": "Advise patient to avoid alcohol while on metformin.",
        "risk_score_weight": 2.5
    },
    frozenset(["simvastatin", "amiodarone"]): {
        "severity": "major",
        "mechanism": "Amiodarone inhibits CYP3A4, increasing simvastatin plasma levels and risk of myopathy and rhabdomyolysis.",
        "recommendation": "Limit simvastatin dose to 20mg/day or switch to pravastatin/rosuvastatin.",
        "risk_score_weight": 4.0
    },
    frozenset(["simvastatin", "clarithromycin"]): {
        "severity": "contraindicated",
        "mechanism": "Clarithromycin is a potent CYP3A4 inhibitor, dramatically increasing simvastatin levels causing severe myopathy risk.",
        "recommendation": "Temporarily discontinue simvastatin during clarithromycin course.",
        "risk_score_weight": 6.0
    },
    frozenset(["lisinopril", "potassium"]): {
        "severity": "major",
        "mechanism": "ACE inhibitors reduce aldosterone, decreasing potassium excretion. Combined with potassium supplements causes hyperkalemia.",
        "recommendation": "Monitor serum potassium levels closely. Avoid high-dose potassium supplements.",
        "risk_score_weight": 4.0
    },
    frozenset(["lisinopril", "spironolactone"]): {
        "severity": "major",
        "mechanism": "Both drugs increase potassium retention through different mechanisms, causing dangerous hyperkalemia.",
        "recommendation": "Use with extreme caution. Monitor potassium and renal function regularly.",
        "risk_score_weight": 4.0
    },
    frozenset(["metoprolol", "verapamil"]): {
        "severity": "contraindicated",
        "mechanism": "Both drugs suppress AV node conduction. Combined effect causes severe bradycardia, heart block, and cardiac arrest risk.",
        "recommendation": "Avoid combination. If needed, use with continuous cardiac monitoring.",
        "risk_score_weight": 6.0
    },
    frozenset(["ssri", "tramadol"]): {
        "severity": "major",
        "mechanism": "Both increase serotonin levels. Combination can cause serotonin syndrome — a potentially life-threatening condition.",
        "recommendation": "Avoid. If pain management needed, use non-serotonergic alternatives.",
        "risk_score_weight": 4.0
    },
    frozenset(["ssri", "maoi"]): {
        "severity": "contraindicated",
        "mechanism": "MAOIs inhibit serotonin breakdown. SSRIs increase serotonin release. Together cause fatal serotonin syndrome.",
        "recommendation": "Absolutely contraindicated. Require 14-day washout period between these drug classes.",
        "risk_score_weight": 6.0
    },
    frozenset(["ciprofloxacin", "antacids"]): {
        "severity": "moderate",
        "mechanism": "Antacids containing aluminum/magnesium chelate ciprofloxacin in the GI tract, reducing its absorption by up to 90%.",
        "recommendation": "Separate doses by at least 2 hours. Take ciprofloxacin first.",
        "risk_score_weight": 2.5
    },
    frozenset(["digoxin", "amiodarone"]): {
        "severity": "major",
        "mechanism": "Amiodarone inhibits P-glycoprotein and renal clearance of digoxin, increasing digoxin levels and toxicity risk.",
        "recommendation": "Reduce digoxin dose by 50% when starting amiodarone. Monitor digoxin levels.",
        "risk_score_weight": 4.0
    },
    frozenset(["clopidogrel", "omeprazole"]): {
        "severity": "moderate",
        "mechanism": "Omeprazole inhibits CYP2C19, reducing conversion of clopidogrel to its active form, reducing antiplatelet efficacy.",
        "recommendation": "Switch to pantoprazole if PPI is needed alongside clopidogrel.",
        "risk_score_weight": 2.5
    },
    frozenset(["lithium", "ibuprofen"]): {
        "severity": "major",
        "mechanism": "NSAIDs reduce renal prostaglandin synthesis, decreasing lithium excretion and increasing lithium toxicity risk.",
        "recommendation": "Avoid NSAIDs with lithium. Use acetaminophen. Monitor lithium levels.",
        "risk_score_weight": 4.0
    },
    frozenset(["phenytoin", "warfarin"]): {
        "severity": "major",
        "mechanism": "Phenytoin both inhibits and induces warfarin metabolism unpredictably, making INR control very difficult.",
        "recommendation": "Monitor INR very closely. Consider alternative anticonvulsants.",
        "risk_score_weight": 4.0
    },
    frozenset(["amlodipine", "simvastatin"]): {
        "severity": "moderate",
        "mechanism": "Amlodipine weakly inhibits CYP3A4, modestly increasing simvastatin exposure and myopathy risk.",
        "recommendation": "Limit simvastatin to 20mg/day when combined with amlodipine.",
        "risk_score_weight": 2.5
    },
    frozenset(["methotrexate", "ibuprofen"]): {
        "severity": "major",
        "mechanism": "NSAIDs reduce renal clearance of methotrexate, increasing its levels and risk of severe toxicity.",
        "recommendation": "Avoid NSAIDs with methotrexate. Use acetaminophen for pain.",
        "risk_score_weight": 4.0
    },
    frozenset(["fluconazole", "warfarin"]): {
        "severity": "major",
        "mechanism": "Fluconazole strongly inhibits CYP2C9, the primary enzyme metabolizing warfarin, causing significantly elevated INR.",
        "recommendation": "Monitor INR closely during and for 1 week after fluconazole. Reduce warfarin dose proactively.",
        "risk_score_weight": 4.0
    }
}

DRUG_ALIASES = {
    "advil": "ibuprofen",
    "motrin": "ibuprofen",
    "tylenol": "acetaminophen",
    "coumadin": "warfarin",
    "glucophage": "metformin",
    "zithromax": "azithromycin",
    "prozac": "fluoxetine",
    "zoloft": "sertraline",
    "lipitor": "atorvastatin",
    "crestor": "rosuvastatin",
    "plavix": "clopidogrel",
    "lasix": "furosemide",
    "norvasc": "amlodipine",
    "lopressor": "metoprolol",
    "prinivil": "lisinopril"
}

def normalize_drug_name(name: str) -> str:
    cleaned_name = name.strip().lower()
    return DRUG_ALIASES.get(cleaned_name, cleaned_name)
