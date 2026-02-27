import React, { useState } from 'react';
import PatientLayout from '../../components/patient/PatientLayout';
import Card from '../../components/shared/Card';
import Badge from '../../components/shared/Badge';
import Button from '../../components/shared/Button';
import CoTExplanation from '../../components/shared/CoTExplanation';
import RecommendationCard from '../../components/shared/RecommendationCard';
import PrescriptionScanner from '../../components/patient/PrescriptionScanner';
import { interactionService, riskService, aiService } from '../../services/api';
import { FileText, CheckCircle, AlertTriangle, AlertCircle, Utensils, Check, CheckCircle2 } from 'lucide-react';

const MedicationsPage = () => {
    const [selectedDrugs, setSelectedDrugs] = useState([]);
    const [inputValue, setInputValue] = useState("");
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState(null);
    const [foodWarnings, setFoodWarnings] = useState(null);
    const [foodWarningsLoading, setFoodWarningsLoading] = useState(false);
    const [expandedFoods, setExpandedFoods] = useState({});
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('summary');
    const [cotData, setCotData] = useState(null);
    const [cotLoading, setCotLoading] = useState(false);

    // Scanner state
    const [showScanner, setShowScanner] = useState(false);
    const [prefilledFromScan, setPrefilledFromScan] = useState(false);
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const val = inputValue.replace(/,/g, '').trim().toLowerCase();
            if (val && !selectedDrugs.includes(val)) {
                setSelectedDrugs([...selectedDrugs, val]);
                setResult(null);
            }
            setInputValue("");
        } else if (e.key === 'Backspace' && inputValue === '') {
            setSelectedDrugs(selectedDrugs.slice(0, -1));
            setResult(null);
        }
    };

    const handleRemoveDrug = (drugName) => {
        setSelectedDrugs(selectedDrugs.filter(d => d !== drugName));
        setResult(null);
    };

    const addPreset = (drugsArray) => {
        const newSet = new Set([...selectedDrugs, ...drugsArray]);
        setSelectedDrugs(Array.from(newSet));
        setResult(null);
    };

    const handleAnalyze = async () => {
        if (selectedDrugs.length < 2) return;

        setError('');
        setAnalyzing(true);
        setFoodWarningsLoading(true);
        try {
            const [riskRes, foodRes] = await Promise.allSettled([
                riskService.assess(selectedDrugs),
                interactionService.getFoodWarnings(selectedDrugs)
            ]);

            if (riskRes.status === "fulfilled") {
                setResult(riskRes.value.data);
                if (riskRes.value.data.assessment_id) {
                    fetchCoT(riskRes.value.data.assessment_id);
                }
            } else {
                throw new Error('Analysis failed.');
            }

            if (foodRes.status === "fulfilled") {
                setFoodWarnings(foodRes.value.data);
            } else {
                setFoodWarnings(null);
            }

            setActiveTab('summary');
            setCotData(null);
            setExpandedFoods({});
        } catch (err) {
            setError('Analysis failed. Please try again.');
        } finally {
            setAnalyzing(false);
            setFoodWarningsLoading(false);
        }
    };

    const fetchCoT = async (assessmentId) => {
        setCotLoading(true);
        try {
            const res = await aiService.explain(assessmentId);
            setCotData(res.data);
        } catch (err) {
            console.error("CoT fetch error", err);
        } finally {
            setCotLoading(false);
        }
    };

    const handleClear = () => {
        setSelectedDrugs([]);
        setResult(null);
        setFoodWarnings(null);
        setExpandedFoods({});
        setInputValue("");
        setError("");
    };

    const toggleFoodExpansion = (foodName) => {
        setExpandedFoods(prev => ({
            ...prev,
            [foodName]: !prev[foodName]
        }));
    };

    const getRiskDisplay = (data) => {
        if (!data) return null;
        const score = data.risk_assessment?.final_score || data.risk_score || 0;
        const category = data.risk_assessment?.risk_category || data.risk_category || "Low";
        const interactions = data.interaction_analysis?.total_interactions || data.total_interactions || 0;

        if (category === "Severe") {
            return {
                icon: <AlertTriangle size={48} className="text-red-500 mx-auto" />,
                title: "High Risk — Immediate Review Needed",
                titleColor: "text-red-600",
                bgColor: "bg-red-50 border-red-200"
            };
        }
        if (category === "Moderate" || (score >= 25 && interactions > 0)) {
            return {
                icon: <AlertTriangle size={48} className="text-yellow-500 mx-auto" />,
                title: "Interactions Detected — Review Recommended",
                titleColor: "text-yellow-700",
                bgColor: "bg-yellow-50 border-yellow-200"
            };
        }
        if (interactions > 0) {
            return {
                icon: <AlertTriangle size={48} className="text-yellow-400 mx-auto" />,
                title: "Minor Interactions Found",
                titleColor: "text-yellow-600",
                bgColor: "bg-yellow-50 border-yellow-100"
            };
        }
        return {
            icon: <CheckCircle2 size={48} className="text-green-500 mx-auto" />,
            title: "Your medications appear safe together",
            titleColor: "text-green-700",
            bgColor: "bg-green-50 border-green-200"
        };
    };

    const riskDisplay = getRiskDisplay(result);

    const getScoreColor = (score, category) => {
        if (category === "Severe" || score >= 55) return "#EF4444";
        if (category === "Moderate" || score >= 25) return "#F59E0B";
        return "#10B981";
    };

    return (
        <PatientLayout>
            <div className="mb-8">
                <h1 className="text-[28px] font-bold text-[var(--color-text-primary)]">Check Your Medications</h1>
                <p className="text-[var(--color-text-secondary)] mt-1">Enter your current medications to check for interactions.</p>
            </div>

            <Card className="p-6 mb-8">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Your Medications</h2>
                    <Button
                        variant={showScanner ? "secondary" : "primary"}
                        size="sm"
                        onClick={() => setShowScanner(!showScanner)}
                        className="py-1.5 px-3 text-xs"
                    >
                        {showScanner ? "× Close Scanner" : (
                            <>
                                <FileText className="inline-block w-3.5 h-3.5 mr-1" />
                                Scan Prescription PDF
                            </>
                        )}
                    </Button>
                </div>

                <div className={`transition-all duration-300 overflow-hidden ${showScanner ? 'mb-6 opacity-100' : 'max-h-0 opacity-0 mb-0'}`}>
                    {showScanner && (
                        <PrescriptionScanner
                            existingDrugs={selectedDrugs}
                            onDrugsExtracted={(drugs) => {
                                const newList = [...new Set([...selectedDrugs, ...drugs])];
                                setSelectedDrugs(newList);
                                setShowScanner(false);
                                setPrefilledFromScan(true);
                                setTimeout(() => setPrefilledFromScan(false), 5000);
                            }}
                        />
                    )}
                </div>

                <p className="text-xs text-[var(--color-text-muted)] mb-3">Type each medication and press Enter to add</p>

                <div className="mb-4">
                    <input
                        type="text"
                        value={inputValue}
                        placeholder="Type a medication name..."
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] transition-all bg-white"
                    />
                </div>

                {selectedDrugs.length > 0 ? (
                    <div className="mb-6">
                        {prefilledFromScan && (
                            <div className="bg-[#F0F9FF] border border-[#BAE6FD] rounded-lg px-3 py-2 mb-3 mt-3 flex items-center animate-in fade-in slide-in-from-top-1">
                                <FileText className="text-[var(--color-primary)] w-3.5 h-3.5 mr-2 shrink-0" />
                                <span className="text-xs text-[var(--color-text-secondary)]">Medications extracted from your prescription PDF.</span>
                                <span className="text-xs text-[var(--color-text-muted)] ml-1">Review and remove any incorrect entries.</span>
                            </div>
                        )}
                        <div className="flex flex-wrap gap-2 mt-3">
                            {selectedDrugs.map(drug => (
                                <div key={drug} className="inline-flex items-center bg-white border border-[var(--color-border)] rounded-full pl-3 pr-2 py-1.5 text-sm font-medium shadow-sm">
                                    <div className="w-1.5 h-1.5 bg-[#0EA5E9] rounded-full mr-2"></div>
                                    <span className="text-[var(--color-text-primary)]">{drug}</span>
                                    <button
                                        onClick={() => handleRemoveDrug(drug)}
                                        className="ml-2 text-xs text-[#86868B] hover:text-[#FF3B30] cursor-pointer"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                        {selectedDrugs.length >= 2 && (
                            <p className="text-xs text-[#34C759] mt-2">
                                ✓ {selectedDrugs.length} medications ready to check
                            </p>
                        )}
                    </div>
                ) : (
                    <p className="text-xs text-[var(--color-text-muted)] mt-2 mb-6">Start typing your medications above</p>
                )}

                <div className="mb-6">
                    <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mt-4 mb-2">Common Combinations</h3>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => addPreset(['warfarin', 'aspirin'])} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] cursor-pointer hover:bg-[#EBEBED] inline-flex items-center">
                            <span className="text-[#86868B] mr-1">+</span> Warfarin + Aspirin
                        </button>
                        <button onClick={() => addPreset(['metformin', 'lisinopril'])} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] cursor-pointer hover:bg-[#EBEBED] inline-flex items-center">
                            <span className="text-[#86868B] mr-1">+</span> Metformin + Lisinopril
                        </button>
                        <button onClick={() => addPreset(['simvastatin', 'amlodipine'])} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] cursor-pointer hover:bg-[#EBEBED] inline-flex items-center">
                            <span className="text-[#86868B] mr-1">+</span> Simvastatin + Amlodipine
                        </button>
                        <button onClick={() => addPreset(['metoprolol', 'aspirin', 'lisinopril'])} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--color-text-primary)] cursor-pointer hover:bg-[#EBEBED] inline-flex items-center">
                            <span className="text-[#86868B] mr-1">+</span> Metoprolol + Aspirin + Lisinopril
                        </button>
                    </div>
                </div>

                {error && <p className="mb-4 text-sm text-[var(--color-danger)]">{error}</p>}

                <Button
                    className="w-full text-base py-3 h-auto mt-4"
                    disabled={selectedDrugs.length < 2 || analyzing}
                    loading={analyzing}
                    onClick={handleAnalyze}
                >
                    {analyzing ? "Checking your medications..." : "Check for Interactions"}
                </Button>
            </Card>

            {/* Results Section */}
            {result && riskDisplay && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className={`${riskDisplay.bgColor} border rounded-2xl p-6 text-center mb-4`}>
                        {riskDisplay.icon}
                        <h3 className={`${riskDisplay.titleColor} font-semibold text-lg mt-3`}>
                            {riskDisplay.title}
                        </h3>

                        <div className="flex justify-center items-center gap-2 mt-3">
                            <div className="flex items-baseline gap-1">
                                <span className="font-bold text-[32px] leading-none" style={{ color: getScoreColor(result.risk_assessment?.final_score || result.risk_score || 0, result.risk_assessment?.risk_category || result.risk_category || "Low") }}>
                                    {(result.risk_assessment?.final_score || result.risk_score || 0).toFixed(1)}
                                </span>
                                <span className="text-[#86868B] text-sm font-medium">/100</span>
                            </div>
                            <Badge color={result.risk_assessment?.risk_category === 'Severe' ? 'red' : result.risk_assessment?.risk_category === 'Moderate' ? 'yellow' : 'green'}>
                                {result.risk_assessment?.risk_category || result.risk_category || "Low"}
                            </Badge>
                        </div>

                        <p className="text-sm text-[#86868B] mt-1">
                            {result.interaction_analysis?.total_interactions || result.total_interactions || 0} interaction(s) detected
                        </p>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-[#EBEBED] mb-6 mt-8">
                        {[
                            { id: 'summary', label: 'Safety Overview' },
                            { id: 'ai_analysis', label: 'AI Deep Dive' },
                            { id: 'alternatives', label: 'Safer Options' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-[1px] ${activeTab === tab.id
                                    ? 'border-[#0EA5E9] text-[#0EA5E9]'
                                    : 'border-transparent text-[#86868B] hover:text-[#1D1D1F]'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'summary' && (
                        <div>
                            {/* Simplified Interactions List */}
                            {(result?.interaction_analysis?.interactions?.length || 0) > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-[#1D1D1F] mb-3 px-1">What You Should Know</h3>
                                    <div className="space-y-3">
                                        {(result?.interaction_analysis?.interactions || []).map((interaction, idx) => {
                                            const sevColor = interaction.severity === 'Major' || interaction.severity === 'Contraindicated' ? '#FF3B30' :
                                                interaction.severity === 'Moderate' ? '#FF9500' : '#34C759';

                                            return (
                                                <Card key={idx} className="relative py-3 px-5 border-l-0 rounded-l-none overflow-hidden">
                                                    <div className="absolute left-0 top-0 bottom-0 w-[4px]" style={{ backgroundColor: sevColor }}></div>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <h4 className="font-semibold text-sm text-[#1D1D1F]">⚠ {interaction.drug1} and {interaction.drug2}</h4>
                                                        <Badge color={sevColor === '#FF3B30' ? 'red' : sevColor === '#FF9500' ? 'yellow' : 'green'}>{interaction.severity}</Badge>
                                                    </div>
                                                    {/* Patient friendly: Show recommendation. Skip dense mechanism. */}
                                                    <p className="text-sm text-[#515154] mt-2 leading-relaxed">{interaction.recommendation || interaction.description}</p>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Patient-friendly Clinical Flags */}
                            {result?.risk_assessment?.clinical_flags && result.risk_assessment.clinical_flags.length > 0 && (
                                <div className="mb-8">
                                    <h3 className="text-sm font-semibold text-[#1D1D1F] mb-3 px-1">Profile Alerts</h3>
                                    <div className="space-y-2">
                                        {result.risk_assessment.clinical_flags.map((flag, idx) => (
                                            <div key={idx} className="bg-[#FFF0F0] border border-[#FFD8D8] rounded-lg p-3 flex gap-3">
                                                <AlertCircle className="text-[#FF3B30] shrink-0 mt-0.5" size={16} />
                                                <p className="text-sm text-[#1D1D1F] leading-tight">{flag}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Food Avoidance Section */}
                            {foodWarnings && foodWarnings.foods_to_avoid && foodWarnings.foods_to_avoid.length > 0 && (
                                <div className="mt-8">
                                    <div className="flex items-center justify-between mb-4 px-1 mt-6">
                                        <div className="flex items-center">
                                            <Utensils className="text-[var(--color-primary)] mr-2 shrink-0" size={18} />
                                            <h3 className="text-base font-semibold text-[#1D1D1F]">Foods to Avoid</h3>
                                        </div>
                                        {foodWarnings.has_major_warnings ? (
                                            <Badge color="red">Major Warnings</Badge>
                                        ) : (
                                            <Badge color="gray">{foodWarnings.total_warnings} foods</Badge>
                                        )}
                                    </div>

                                    {foodWarnings.has_major_warnings && (
                                        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-4 py-3 mb-3 flex items-center">
                                            <AlertTriangle className="text-[#EF4444] shrink-0" size={16} />
                                            <p className="text-sm text-[#EF4444] font-medium ml-2">Some of your medications have major food interactions. Please read carefully.</p>
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        {foodWarnings.foods_to_avoid.map((food, idx) => {
                                            const borderColor = food.severity === 'major' ? '#EF4444' : food.severity === 'moderate' ? '#F59E0B' : '#10B981';
                                            const isExpanded = !!expandedFoods[food.food];

                                            return (
                                                <Card key={idx} className="relative py-3 px-4 border border-[#EBEBED] rounded-lg shadow-sm" style={{ borderLeft: `3px solid ${borderColor}` }}>
                                                    <div className="flex items-center">
                                                        <span className="text-xl mr-3 shrink-0">{food.emoji}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between mb-0.5">
                                                                <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">{food.food}</h4>
                                                                <Badge color={food.severity === 'major' ? 'red' : food.severity === 'moderate' ? 'yellow' : 'green'}>{food.severity}</Badge>
                                                            </div>
                                                            <div className="flex flex-wrap items-center mt-1">
                                                                <span className="text-xs text-[var(--color-text-muted)] mr-1.5 shrink-0">Affects:</span>
                                                                {food.affects_drugs.map((drug) => (
                                                                    <span key={drug} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full px-2 py-0.5 text-xs font-medium text-[var(--color-text-primary)] mr-1 mb-1 capitalize">
                                                                        {drug}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-3 flex items-center">
                                                        <Check className="text-[#34C759] shrink-0 mr-2" size={14} />
                                                        <p className="text-sm text-[var(--color-text-secondary)]">{food.advice}</p>
                                                    </div>

                                                    <button
                                                        onClick={() => toggleFoodExpansion(food.food)}
                                                        className="text-xs text-[#0EA5E9] font-medium mt-2 cursor-pointer hover:underline focus:outline-none"
                                                    >
                                                        {isExpanded ? 'Hide details' : 'Why?'}
                                                    </button>

                                                    {isExpanded && (
                                                        <div className="bg-[var(--color-surface)] rounded-lg px-3 py-2 mt-2">
                                                            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{food.why}</p>
                                                        </div>
                                                    )}
                                                </Card>
                                            );
                                        })}
                                    </div>

                                    <div className="mt-6 border-t border-[#EBEBED] pt-4">
                                        <p className="text-xs text-[var(--color-text-muted)] italic text-center">
                                            🩺 These are general guidelines. Always consult your doctor or pharmacist before changing your diet.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'ai_analysis' && (
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold text-[#1D1D1F] mb-4 px-1">Clinical Pharmacist Analysis</h3>
                            <Card className="p-6">
                                <CoTExplanation
                                    steps={cotData?.explanation?.steps}
                                    loading={cotLoading}
                                    error={cotData?.explanation?.error}
                                    modelUsed={cotData?.explanation?.model_used}
                                />
                            </Card>
                        </div>
                    )}

                    {activeTab === 'alternatives' && (
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold text-[#1D1D1F] mb-4 px-1">Safer Alternatives Options</h3>
                            {result.recommendations && result.recommendations.length > 0 ? (
                                <div className="space-y-4">
                                    {result.recommendations.map((rec, idx) => (
                                        <RecommendationCard key={idx} recommendation={rec} />
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-[#F4FCE3] border border-[#D8F3AA] rounded-xl p-5 flex gap-4">
                                    <CheckCircle className="text-[#34C759] shrink-0 mt-0.5" size={20} />
                                    <div>
                                        <h4 className="font-semibold text-[#1D1D1F]">No safer alternatives needed</h4>
                                        <p className="text-sm text-[#515154] mt-1">We couldn't find any common safer alternatives that would drastically reduce your interaction risk.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-4 mt-8 pt-6 border-t border-[#EBEBED]">
                        <Button className="flex-1" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                            Assesment Saved
                        </Button>
                        <Button variant="secondary" className="flex-1" onClick={handleClear}>
                            Clear & Start Over
                        </Button>
                    </div>
                </div>
            )}
        </PatientLayout>
    );
};

export default MedicationsPage;
