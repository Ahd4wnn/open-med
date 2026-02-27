# mappings of foods to drug interactions

FOOD_DRUG_INTERACTIONS = {
    "grapefruit": [
        {
            "affects_drug_class": "Statins",
            "specific_drugs": ["simvastatin", "atorvastatin", "lovastatin"],
            "effect": "Significantly increases statin blood levels",
            "severity": "major",
            "mechanism": "Grapefruit contains furanocoumarins that irreversibly inhibit CYP3A4 in the gut wall, dramatically increasing statin absorption.",
            "recommendation": "Avoid grapefruit entirely while taking statins. Switch to pravastatin or rosuvastatin which are not affected."
        },
        {
            "affects_drug_class": "Calcium Channel Blockers",
            "specific_drugs": ["amlodipine", "verapamil", "nifedipine"],
            "effect": "Increases drug levels causing excessive blood pressure lowering",
            "severity": "moderate",
            "mechanism": "CYP3A4 inhibition in gut wall increases drug bioavailability.",
            "recommendation": "Avoid grapefruit. Use orange or apple juice instead."
        },
        {
            "affects_drug_class": "Anticoagulants",
            "specific_drugs": ["warfarin"],
            "effect": "May increase anticoagulant effect and bleeding risk",
            "severity": "moderate",
            "mechanism": "CYP3A4 and CYP2C9 inhibition affects warfarin metabolism.",
            "recommendation": "Limit grapefruit consumption. Monitor INR more frequently."
        }
    ],
    "alcohol": [
        {
            "affects_drug_class": "Biguanides",
            "specific_drugs": ["metformin"],
            "effect": "Increases risk of lactic acidosis",
            "severity": "major",
            "mechanism": "Alcohol impairs hepatic lactate metabolism, compounding metformin's effect on lactate.",
            "recommendation": "Avoid alcohol while taking metformin."
        },
        {
            "affects_drug_class": "Anticonvulsants",
            "specific_drugs": ["phenytoin"],
            "effect": "Acute alcohol increases phenytoin levels; chronic use decreases them",
            "severity": "major",
            "mechanism": "Acute alcohol inhibits phenytoin metabolism; chronic alcohol induces CYP2C9 increasing phenytoin clearance.",
            "recommendation": "Avoid alcohol completely with phenytoin."
        },
        {
            "affects_drug_class": "Anticoagulants",
            "specific_drugs": ["warfarin"],
            "effect": "Unpredictably alters anticoagulation \u2014 increases bleeding risk",
            "severity": "major",
            "mechanism": "Alcohol affects CYP2C9 metabolism of warfarin both acutely and chronically in opposing directions.",
            "recommendation": "Strictly limit or avoid alcohol with warfarin."
        },
        {
            "affects_drug_class": "Beta-blockers",
            "specific_drugs": ["metoprolol"],
            "effect": "Enhanced blood pressure lowering, dizziness risk",
            "severity": "moderate",
            "mechanism": "Additive vasodilatory effects causing hypotension.",
            "recommendation": "Limit alcohol consumption."
        }
    ],
    "leafy greens": [
        {
            "affects_drug_class": "Anticoagulants",
            "specific_drugs": ["warfarin"],
            "effect": "Reduces anticoagulant effectiveness",
            "severity": "major",
            "mechanism": "High vitamin K content in spinach, kale, broccoli directly counteracts warfarin's mechanism of action.",
            "recommendation": "Maintain consistent vitamin K intake \u2014 do not dramatically increase or decrease leafy green consumption."
        }
    ],
    "spinach": [
        {
            "affects_drug_class": "Anticoagulants",
            "specific_drugs": ["warfarin"],
            "effect": "Reduces anticoagulant effectiveness",
            "severity": "major",
            "mechanism": "High vitamin K content in spinach, kale, broccoli directly counteracts warfarin's mechanism of action.",
            "recommendation": "Maintain consistent vitamin K intake \u2014 do not dramatically increase or decrease leafy green consumption."
        }
    ],
    "kale": [
        {
            "affects_drug_class": "Anticoagulants",
            "specific_drugs": ["warfarin"],
            "effect": "Reduces anticoagulant effectiveness",
            "severity": "major",
            "mechanism": "High vitamin K content in spinach, kale, broccoli directly counteracts warfarin's mechanism of action.",
            "recommendation": "Maintain consistent vitamin K intake \u2014 do not dramatically increase or decrease leafy green consumption."
        }
    ],
    "broccoli": [
        {
            "affects_drug_class": "Anticoagulants",
            "specific_drugs": ["warfarin"],
            "effect": "Reduces anticoagulant effectiveness",
            "severity": "major",
            "mechanism": "High vitamin K content in spinach, kale, broccoli directly counteracts warfarin's mechanism of action.",
            "recommendation": "Maintain consistent vitamin K intake \u2014 do not dramatically increase or decrease leafy green consumption."
        }
    ],
    "licorice": [
        {
            "affects_drug_class": "Antihypertensives",
            "specific_drugs": ["lisinopril", "metoprolol", "amlodipine"],
            "effect": "Reduces effectiveness of blood pressure medications",
            "severity": "moderate",
            "mechanism": "Glycyrrhizin in licorice causes sodium retention and potassium loss, raising blood pressure.",
            "recommendation": "Avoid licorice candy and supplements."
        }
    ],
    "dairy": [
        {
            "affects_drug_class": "Antibiotics",
            "specific_drugs": ["ciprofloxacin"],
            "effect": "Reduces antibiotic absorption by up to 50%",
            "severity": "moderate",
            "mechanism": "Calcium in dairy chelates ciprofloxacin in the GI tract, reducing absorption.",
            "recommendation": "Take ciprofloxacin 2 hours before or 6 hours after dairy products."
        }
    ],
    "tyramine foods": [
        {
            "affects_drug_class": "MAOIs",
            "specific_drugs": ["maoi"],
            "effect": "Potentially fatal hypertensive crisis",
            "severity": "major",
            "mechanism": "MAOIs prevent tyramine breakdown. Tyramine-rich foods (aged cheese, cured meats, fermented foods) cause dangerous norepinephrine surge.",
            "recommendation": "Strictly avoid aged cheeses, cured meats, fermented foods, and red wine with MAOIs."
        }
    ],
    "aged cheese": [
        {
            "affects_drug_class": "MAOIs",
            "specific_drugs": ["maoi"],
            "effect": "Potentially fatal hypertensive crisis",
            "severity": "major",
            "mechanism": "MAOIs prevent tyramine breakdown. Tyramine-rich foods (aged cheese, cured meats, fermented foods) cause dangerous norepinephrine surge.",
            "recommendation": "Strictly avoid aged cheeses, cured meats, fermented foods, and red wine with MAOIs."
        }
    ],
    "cured meat": [
        {
            "affects_drug_class": "MAOIs",
            "specific_drugs": ["maoi"],
            "effect": "Potentially fatal hypertensive crisis",
            "severity": "major",
            "mechanism": "MAOIs prevent tyramine breakdown. Tyramine-rich foods (aged cheese, cured meats, fermented foods) cause dangerous norepinephrine surge.",
            "recommendation": "Strictly avoid aged cheeses, cured meats, fermented foods, and red wine with MAOIs."
        }
    ],
    "red wine": [
        {
            "affects_drug_class": "MAOIs",
            "specific_drugs": ["maoi"],
            "effect": "Potentially fatal hypertensive crisis",
            "severity": "major",
            "mechanism": "MAOIs prevent tyramine breakdown. Tyramine-rich foods (aged cheese, cured meats, fermented foods) cause dangerous norepinephrine surge.",
            "recommendation": "Strictly avoid aged cheeses, cured meats, fermented foods, and red wine with MAOIs."
        },
        {
            "affects_drug_class": "Biguanides",
            "specific_drugs": ["metformin"],
            "effect": "Increases risk of lactic acidosis",
            "severity": "major",
            "mechanism": "Alcohol impairs hepatic lactate metabolism, compounding metformin's effect on lactate.",
            "recommendation": "Avoid alcohol while taking metformin."
        },
        {
            "affects_drug_class": "Anticonvulsants",
            "specific_drugs": ["phenytoin"],
            "effect": "Acute alcohol increases phenytoin levels; chronic use decreases them",
            "severity": "major",
            "mechanism": "Acute alcohol inhibits phenytoin metabolism; chronic alcohol induces CYP2C9 increasing phenytoin clearance.",
            "recommendation": "Avoid alcohol completely with phenytoin."
        },
        {
            "affects_drug_class": "Anticoagulants",
            "specific_drugs": ["warfarin"],
            "effect": "Unpredictably alters anticoagulation \u2014 increases bleeding risk",
            "severity": "major",
            "mechanism": "Alcohol affects CYP2C9 metabolism of warfarin both acutely and chronically in opposing directions.",
            "recommendation": "Strictly limit or avoid alcohol with warfarin."
        },
        {
            "affects_drug_class": "Beta-blockers",
            "specific_drugs": ["metoprolol"],
            "effect": "Enhanced blood pressure lowering, dizziness risk",
            "severity": "moderate",
            "mechanism": "Additive vasodilatory effects causing hypotension.",
            "recommendation": "Limit alcohol consumption."
        }
    ],
    "high potassium foods": [
        {
            "affects_drug_class": "ACE Inhibitors",
            "specific_drugs": ["lisinopril"],
            "effect": "Risk of dangerous hyperkalemia",
            "severity": "major",
            "mechanism": "ACE inhibitors already increase potassium retention. High potassium foods (bananas, avocados, potatoes) compound this.",
            "recommendation": "Moderate intake of high-potassium foods. Monitor serum potassium regularly."
        }
    ],
    "banana": [
        {
            "affects_drug_class": "ACE Inhibitors",
            "specific_drugs": ["lisinopril"],
            "effect": "Risk of dangerous hyperkalemia",
            "severity": "major",
            "mechanism": "ACE inhibitors already increase potassium retention. High potassium foods (bananas, avocados, potatoes) compound this.",
            "recommendation": "Moderate intake of high-potassium foods. Monitor serum potassium regularly."
        }
    ],
    "avocado": [
        {
            "affects_drug_class": "ACE Inhibitors",
            "specific_drugs": ["lisinopril"],
            "effect": "Risk of dangerous hyperkalemia",
            "severity": "major",
            "mechanism": "ACE inhibitors already increase potassium retention. High potassium foods (bananas, avocados, potatoes) compound this.",
            "recommendation": "Moderate intake of high-potassium foods. Monitor serum potassium regularly."
        }
    ]
}

LIFESTYLE_CONDITION_RISKS = {
    "smoking_current": {
        "conditions_worsened": ["hypertension", "diabetes", "heart disease"],
        "drug_effects": {
            "warfarin": "Smoking induces CYP1A2, reducing warfarin efficacy",
            "insulin": "Smoking causes insulin resistance",
            "beta_blockers": "Smoking reduces effectiveness of beta-blockers"
        },
        "risk_multiplier": 1.4,
        "recommendation": "Smoking cessation is strongly recommended."
    },
    "alcohol_heavy": {
        "conditions_worsened": ["liver disease", "diabetes", "hypertension"],
        "drug_effects": {
            "metformin": "High lactic acidosis risk",
            "warfarin": "Unpredictable INR fluctuations",
            "acetaminophen": "Severe hepatotoxicity risk"
        },
        "risk_multiplier": 1.35,
        "recommendation": "Reduce alcohol to less than 14 units per week."
    },
    "sleep_poor": {
        "conditions_worsened": ["hypertension", "diabetes", "depression"],
        "drug_effects": {
            "antihypertensives": "Poor sleep worsens hypertension, reducing drug efficacy",
            "antidepressants": "Sleep deprivation reduces antidepressant effectiveness"
        },
        "risk_multiplier": 1.15,
        "recommendation": "Aim for 7-9 hours of quality sleep per night."
    },
    "sedentary": {
        "conditions_worsened": ["diabetes", "hypertension", "heart disease", "obesity"],
        "drug_effects": {
            "metformin": "Exercise improves insulin sensitivity, affecting metformin dosing needs",
            "statins": "Exercise reduces cardiovascular risk, may allow lower statin dose"
        },
        "risk_multiplier": 1.2,
        "recommendation": "150 minutes of moderate exercise per week recommended."
    },
    "stress_high": {
        "conditions_worsened": ["hypertension", "diabetes", "heart disease", "depression"],
        "drug_effects": {
            "antihypertensives": "Chronic stress raises cortisol, worsening hypertension",
            "antidepressants": "High stress may require dose adjustment"
        },
        "risk_multiplier": 1.2,
        "recommendation": "Stress management techniques recommended."
    }
}
