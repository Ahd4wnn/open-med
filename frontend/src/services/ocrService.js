import * as Tesseract from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";
import api from "./api";

export async function scanPrescriptionWithBackend(
    file,
    onProgress,
    onStatusChange
) {
    try {
        onStatusChange("Uploading prescription...");
        onProgress(10);

        const formData = new FormData();
        formData.append("file", file);

        onStatusChange("Analyzing with AI...");
        onProgress(30);

        const response = await api.post(
            "/api/ocr/scan-prescription",
            formData,
            {
                headers: { "Content-Type": "multipart/form-data" },
                timeout: 60000
            }
        );

        const data = response.data;
        onProgress(70);

        // If backend says use Tesseract fallback
        if (data.use_tesseract_fallback) {
            onStatusChange("Switching to browser OCR...");

            // If backend sent back images, use them
            if (data.images_base64 && data.images_base64.length > 0) {
                let allText = "";
                const images = data.images_base64;

                for (let i = 0; i < images.length; i++) {
                    onStatusChange(
                        `Browser OCR: page ${i + 1} of ${images.length}...`
                    );
                    const imageUrl =
                        `data:image/png;base64,${images[i]}`;
                    const text = await extractTextFromImage(
                        imageUrl,
                        (p) => {
                            const base = 70 + (i / images.length) * 25;
                            const step = (1 / images.length) * 25;
                            onProgress(
                                Math.round(base + (p / 100) * step)
                            );
                        }
                    );
                    allText += text + "\n";
                }

                const drugs = extractDrugNames(allText);
                onProgress(100);
                onStatusChange("Done!");

                return {
                    success: true,
                    drugs_found: drugs,
                    confidence: drugs.length > 0 ? "medium" : "low",
                    method_used: "tesseract_browser",
                    pages_processed: images.length,
                    raw_text: allText
                };
            } else {
                // No images from backend, process PDF locally
                return await processPrescriptionPDF(
                    file, onProgress, onStatusChange
                );
            }
        }

        // OpenAI succeeded
        onProgress(100);
        onStatusChange("Done!");

        return {
            success: true,
            drugs_found: data.drugs_found || [],
            confidence: data.confidence || "medium",
            method_used: data.method_used,
            pages_processed: data.pages_processed,
            notes: data.notes || "",
            raw_text: ""
        };

    } catch (err) {
        console.error("Backend OCR failed:", err);
        onStatusChange("Trying browser OCR...");

        // Full fallback to local Tesseract
        return await processPrescriptionPDF(
            file, onProgress, onStatusChange
        );
    }
}

// Set PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = window.pdfjsWorkerSrc ||
    `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// Common drug name patterns to extract from OCR text
const DRUG_PATTERNS = [
    // Generic names — common drugs
    "warfarin", "aspirin", "metformin", "lisinopril",
    "metoprolol", "simvastatin", "atorvastatin",
    "amlodipine", "omeprazole", "amiodarone", "digoxin",
    "fluconazole", "ibuprofen", "clopidogrel", "lithium",
    "phenytoin", "methotrexate", "furosemide", "spironolactone",
    "levothyroxine", "sertraline", "fluoxetine", "escitalopram",
    "alprazolam", "lorazepam", "diazepam", "tramadol",
    "codeine", "gabapentin", "pregabalin", "losartan",
    "valsartan", "ramipril", "bisoprolol", "carvedilol",
    "rosuvastatin", "pravastatin", "pantoprazole", "esomeprazole",
    "ciprofloxacin", "azithromycin", "amoxicillin", "doxycycline",
    "metronidazole", "clarithromycin", "insulin", "glipizide",
    "sitagliptin", "empagliflozin", "dapagliflozin",
    "rivaroxaban", "apixaban", "dabigatran", "clopidogrel",
    "atenolol", "nifedipine", "verapamil", "diltiazem",
    "hydrochlorothiazide", "chlorthalidone", "acetaminophen",
    "naproxen", "celecoxib", "prednisone", "prednisolone",
    "allopurinol", "colchicine", "hydroxychloroquine",
    "adalimumab", "methotrexate", "sulfasalazine",

    // Brand names mapped to generic
    "advil", "motrin", "tylenol", "coumadin", "glucophage",
    "lipitor", "crestor", "norvasc", "lopressor", "prinivil",
    "zestril", "plavix", "lasix", "synthroid", "zoloft",
    "prozac", "lexapro", "xanax", "ativan", "valium",
    "nexium", "prilosec", "prevacid", "zithromax", "augmentin"
];

// Drug aliases (brand → generic)
const DRUG_ALIASES = {
    "advil": "ibuprofen",
    "motrin": "ibuprofen",
    "tylenol": "acetaminophen",
    "coumadin": "warfarin",
    "glucophage": "metformin",
    "lipitor": "atorvastatin",
    "crestor": "rosuvastatin",
    "norvasc": "amlodipine",
    "lopressor": "metoprolol",
    "prinivil": "lisinopril",
    "zestril": "lisinopril",
    "plavix": "clopidogrel",
    "lasix": "furosemide",
    "synthroid": "levothyroxine",
    "zoloft": "sertraline",
    "prozac": "fluoxetine",
    "lexapro": "escitalopram",
    "xanax": "alprazolam",
    "ativan": "lorazepam",
    "valium": "diazepam",
    "nexium": "esomeprazole",
    "prilosec": "omeprazole",
    "prevacid": "lansoprazole",
    "zithromax": "azithromycin",
    "augmentin": "amoxicillin"
};

export async function convertPdfToImages(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const images = [];

    for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext("2d");
        await page.render({
            canvasContext: ctx,
            viewport
        }).promise;

        images.push(canvas.toDataURL("image/png"));
    }

    return images;
}

export async function extractTextFromImage(
    imageDataUrl,
    onProgress
) {
    const result = await Tesseract.recognize(
        imageDataUrl,
        "eng",
        {
            logger: (m) => {
                if (m.status === "recognizing text" && onProgress) {
                    onProgress(Math.round(m.progress * 100));
                }
            }
        }
    );
    return result.data.text;
}

export function extractDrugNames(rawText) {
    if (!rawText) return [];

    const text = rawText.toLowerCase();
    const lines = text
        .split("\n")
        .map(l => l.trim())
        .filter(l => l.length > 0);

    const foundDrugs = new Map();
    // Map: generic_name → { source, confidence }

    const KNOWN_DRUGS = [
        "warfarin", "aspirin", "metformin", "lisinopril",
        "metoprolol", "simvastatin", "atorvastatin",
        "amlodipine", "omeprazole", "amiodarone", "digoxin",
        "fluconazole", "ibuprofen", "clopidogrel", "lithium",
        "phenytoin", "methotrexate", "furosemide",
        "spironolactone", "levothyroxine", "sertraline",
        "fluoxetine", "escitalopram", "alprazolam", "lorazepam",
        "diazepam", "tramadol", "codeine", "gabapentin",
        "pregabalin", "losartan", "valsartan", "ramipril",
        "bisoprolol", "carvedilol", "rosuvastatin", "pravastatin",
        "pantoprazole", "esomeprazole", "ciprofloxacin",
        "azithromycin", "amoxicillin", "doxycycline",
        "metronidazole", "clarithromycin", "insulin", "glipizide",
        "sitagliptin", "rivaroxaban", "apixaban", "dabigatran",
        "atenolol", "nifedipine", "verapamil", "diltiazem",
        "acetaminophen", "naproxen", "celecoxib", "prednisone",
        "prednisolone", "allopurinol", "colchicine",
        "hydroxychloroquine", "hydrochlorothiazide",
        "empagliflozin", "dapagliflozin"
    ];

    const DRUG_ALIASES = {
        "advil": "ibuprofen",
        "motrin": "ibuprofen",
        "tylenol": "acetaminophen",
        "coumadin": "warfarin",
        "glucophage": "metformin",
        "lipitor": "atorvastatin",
        "crestor": "rosuvastatin",
        "norvasc": "amlodipine",
        "lopressor": "metoprolol",
        "prinivil": "lisinopril",
        "zestril": "lisinopril",
        "plavix": "clopidogrel",
        "lasix": "furosemide",
        "synthroid": "levothyroxine",
        "zoloft": "sertraline",
        "prozac": "fluoxetine",
        "lexapro": "escitalopram",
        "xanax": "alprazolam",
        "ativan": "lorazepam",
        "valium": "diazepam",
        "nexium": "esomeprazole",
        "prilosec": "omeprazole",
        "prevacid": "lansoprazole",
        "zithromax": "azithromycin",
        "augmentin": "amoxicillin",
        "deltasone": "prednisone",
        "medrol": "methylprednisolone",
        "diflucan": "fluconazole",
        "neurontin": "gabapentin",
        "lyrica": "pregabalin",
        "cozaar": "losartan",
        "diovan": "valsartan",
        "coreg": "carvedilol",
        "toprol": "metoprolol",
        "altace": "ramipril",
        "lanoxin": "digoxin"
    };

    // STEP 1 — Extract words per line with strict 
    // word boundary matching only
    // This prevents "verapamil" matching "erapamil" 
    // from garbled OCR text

    for (const line of lines) {
        // Clean line — remove numbers, dots, special chars
        // but keep letters and spaces
        const cleanLine = line
            .replace(/^\d+[\.\)\-\s]+/, "") // Remove "1." "2)" etc
            .replace(/[^a-z\s]/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        if (cleanLine.length < 3) continue;

        // Split into individual words
        const words = cleanLine.split(" ").filter(w => w.length >= 3);

        for (const word of words) {
            // Check aliases first (exact word match)
            if (DRUG_ALIASES[word]) {
                const generic = DRUG_ALIASES[word];
                if (!foundDrugs.has(generic)) {
                    foundDrugs.set(generic, {
                        source: `alias:${word}`,
                        confidence: "high"
                    });
                }
                continue;
            }

            // Check exact drug name match
            if (KNOWN_DRUGS.includes(word)) {
                if (!foundDrugs.has(word)) {
                    foundDrugs.set(word, {
                        source: "exact",
                        confidence: "high"
                    });
                }
                continue;
            }

            // Check if word STARTS WITH a known drug name
            // (handles OCR adding extra chars at end)
            // Minimum 5 chars to avoid false positives
            if (word.length >= 5) {
                for (const drug of KNOWN_DRUGS) {
                    if (drug.length >= 5 && word.startsWith(drug)) {
                        if (!foundDrugs.has(drug)) {
                            foundDrugs.set(drug, {
                                source: "prefix",
                                confidence: "medium"
                            });
                        }
                        break;
                    }
                }
                // Check alias prefix too
                for (const [alias, generic] of
                    Object.entries(DRUG_ALIASES)) {
                    if (alias.length >= 5 && word.startsWith(alias)) {
                        if (!foundDrugs.has(generic)) {
                            foundDrugs.set(generic, {
                                source: `alias_prefix:${alias}`,
                                confidence: "medium"
                            });
                        }
                        break;
                    }
                }
            }
        }
    }

    // STEP 2 — Look for numbered list pattern specifically
    // "1.aspirin", "2.advil" etc — very high confidence
    const numberedPattern = /^\d+[\.\)]\s*([a-zA-Z]+)/gm;
    let match;
    const textCopy = rawText.toLowerCase();

    while ((match = numberedPattern.exec(textCopy)) !== null) {
        const word = match[1].toLowerCase().trim();

        // Exact alias match
        if (DRUG_ALIASES[word]) {
            const generic = DRUG_ALIASES[word];
            foundDrugs.set(generic, {
                source: "numbered_list_alias",
                confidence: "high"
            });
            continue;
        }

        // Exact drug match
        if (KNOWN_DRUGS.includes(word)) {
            foundDrugs.set(word, {
                source: "numbered_list",
                confidence: "high"
            });
            continue;
        }

        // Partial match for numbered lists 
        // (higher tolerance since format is clear)
        for (const drug of KNOWN_DRUGS) {
            if (drug.length >= 4 && (
                word.startsWith(drug) ||
                drug.startsWith(word.slice(0, Math.min(word.length, 8)))
            )) {
                foundDrugs.set(drug, {
                    source: "numbered_list_partial",
                    confidence: "medium"
                });
                break;
            }
        }
        for (const [alias, generic] of
            Object.entries(DRUG_ALIASES)) {
            if (alias.length >= 4 && word.startsWith(alias)) {
                foundDrugs.set(generic, {
                    source: "numbered_list_alias_partial",
                    confidence: "medium"
                });
                break;
            }
        }
    }

    // STEP 3 — Deduplication
    // If both a brand name AND its generic were found,
    // keep only the generic (remove the brand)
    // This prevents "aspirin" + "aspirin" duplicates
    const genericValues = new Set(
        Object.values(DRUG_ALIASES)
    );

    const finalDrugs = [];
    for (const [drug, meta] of foundDrugs.entries()) {
        finalDrugs.push({
            name: drug,
            confidence: meta.confidence,
            source: meta.source
        });
    }

    // Sort: high confidence first, then alphabetical
    finalDrugs.sort((a, b) => {
        const confOrder = { high: 0, medium: 1, low: 2 };
        const confDiff = confOrder[a.confidence] -
            confOrder[b.confidence];
        if (confDiff !== 0) return confDiff;
        return a.name.localeCompare(b.name);
    });

    return finalDrugs.map(d => d.name);
}

export async function processPrescriptionPDF(
    file,
    onProgress,
    onStatusChange
) {
    try {
        onStatusChange("Converting PDF to image...");
        onProgress(5);

        const images = await convertPdfToImages(file);

        if (images.length === 0) {
            throw new Error("Could not extract pages from PDF");
        }

        onStatusChange(`Processing ${images.length} page(s)...`);
        onProgress(20);

        let allText = "";

        for (let i = 0; i < images.length; i++) {
            onStatusChange(
                `Reading page ${i + 1} of ${images.length}...`
            );
            const text = await extractTextFromImage(
                images[i],
                (p) => {
                    const base = 20 + (i / images.length) * 60;
                    const step = (1 / images.length) * 60;
                    onProgress(Math.round(base + (p / 100) * step));
                }
            );
            allText += text + "\n";
        }

        onStatusChange("Extracting medication names...");
        onProgress(85);

        const drugs = extractDrugNames(allText);

        onProgress(100);
        onStatusChange("Done!");

        return {
            success: true,
            drugs_found: drugs,
            raw_text: allText,
            pages_processed: images.length,
            confidence: drugs.length > 0 ? "medium" : "low"
        };

    } catch (err) {
        return {
            success: false,
            error: err.message,
            drugs_found: [],
            raw_text: ""
        };
    }
}
