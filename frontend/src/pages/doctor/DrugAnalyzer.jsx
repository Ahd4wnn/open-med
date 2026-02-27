import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import DoctorLayout from '../../components/doctor/DoctorLayout';
import Card from '../../components/shared/Card';
import FreeTypeInput from '../../components/shared/FreeTypeInput';
import PatientSelector from '../../components/shared/PatientSelector';
import Badge from '../../components/shared/Badge';
import Button from '../../components/shared/Button';
import Input from '../../components/shared/Input';
import CoTExplanation from '../../components/shared/CoTExplanation';
import RecommendationCard from '../../components/shared/RecommendationCard';
import { interactionService, riskService, aiService } from '../../services/api';
import { Info, Plus, Pill, ChevronDown, AlertTriangle, CheckCircle, Check } from "lucide-react";

const DrugAnalyzer = () => {
    const location = useLocation();
    const [selectedDrugs, setSelectedDrugs] = useState([]);
    const [inputValue, setInputValue] = useState("");
    const [doses, setDoses] = useState({});

    const [selectedPatient, setSelectedPatient] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState('');
    const [factorsOpen, setFactorsOpen] = useState(true);
    const [activeTab, setActiveTab] = useState('interactions');

    const [aiExplanation, setAiExplanation] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);

    const [foodWarnings, setFoodWarnings] = useState(null);
    const [drugInfoData, setDrugInfoData] = useState({});
    const [drugInfoLoading, setDrugInfoLoading] = useState({});
    const [result, setResult] = useState(null);
    const [prefilled, setPrefilled] = useState(false);

    useEffect(() => {
        if (location.state?.preselectedPatient) {
            const p = location.state.preselectedPatient;
            setSelectedPatient(p);

            if (p.medications) {
                const meds = p.medications
                    .split(",")
                    .map(m => m.trim().toLowerCase())
                    .filter(m => m.length > 0);
                setSelectedDrugs(meds);
                setPrefilled(true);
            }

            window.history.replaceState({}, document.title);
        }
    }, [location]);

    const addPreset = (drugsArray) => {
        const newSet = new Set([...selectedDrugs, ...drugsArray]);
        setSelectedDrugs(Array.from(newSet));
        setResult(null);
        setAiExplanation(null);
        setFoodWarnings(null);
    };

    const handleAnalyze = async () => {
        if (selectedDrugs.length < 2) return;

        setError('');
        setAnalyzing(true);
        try {
            const pId = selectedPatient ? selectedPatient.profile_id : null;

            const [riskRes, foodRes] = await Promise.allSettled([
                riskService.assess(selectedDrugs, pId),
                interactionService.getFoodWarnings(selectedDrugs)
            ]);

            if (riskRes.status === "fulfilled") {
                setResult(riskRes.value.data);
            } else {
                throw new Error('Analysis failed.');
            }

            if (foodRes.status === "fulfilled") {
                setFoodWarnings(foodRes.value.data);
            } else {
                setFoodWarnings(null);
            }

            setActiveTab('interactions');
            setAiExplanation(null); // clear old reasoning
            setDrugInfoData({});
        } catch (err) {
            setError(err.response?.data?.detail || 'Analysis failed. Please try again.');
        } finally {
            setAnalyzing(false);
        }
    };

    const fetchCoT = async (assessmentId) => {
        if (cotData || cotLoading) return;
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

    const fetchDrugInfo = async (drugName) => {
        if (drugInfoData[drugName] || drugInfoLoading[drugName]) return;

        setDrugInfoLoading(prev => ({ ...prev, [drugName]: true }));
        try {
            const res = await aiService.getDrugInfo(drugName);
            setDrugInfoData(prev => ({ ...prev, [drugName]: res.data }));
        } catch (err) {
            console.error("Drug info fetch error", err);
        } finally {
            setDrugInfoLoading(prev => ({ ...prev, [drugName]: false }));
        }
    };

    useEffect(() => {
        const fetchDirectAIExplanation = async () => {
            if (activeTab === 'ai_reasoning' && result && !aiExplanation && !aiLoading) {
                setAiLoading(true);
                try {
                    const res = await aiService.explainDirect(
                        result.drugs_analyzed || selectedDrugs,
                        result,
                        result.risk_assessment || {},
                        selectedPatient ? selectedPatient.profile_id : null
                    );
                    setAiExplanation(res.data);
                } catch (e) {
                    console.error("AI explanation failed", e);
                } finally {
                    setAiLoading(false);
                }
            }
        };

        fetchDirectAIExplanation();

        if (activeTab === 'drug_info' && selectedDrugs.length > 0) {
            selectedDrugs.forEach(drug => fetchDrugInfo(drug));
        }
    }, [activeTab, result, selectedDrugs, aiExplanation, aiLoading, selectedPatient]);

    return (
        <DoctorLayout>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">

                {/* Left Panel - Inputs */}
                <div className="lg:col-span-6 xl:col-span-7 flex flex-col gap-6">
                    <Card className="p-6">
                        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-6">Add Medications</h2>

                        <div className="mb-6">
                            {selectedPatient && selectedDrugs.length > 0 && prefilled && (
                                <div className="bg-[#F0F9FF] border border-[#BAE6FD] rounded-lg px-3 py-2 mb-3 flex items-center">
                                    <Info size={14} className="text-[#0EA5E9] mr-2 shrink-0" />
                                    <span className="text-xs text-[#515154]">Medications pre-filled from {selectedPatient.full_name}'s profile. Add or remove as needed.</span>
                                </div>
                            )}
                            <FreeTypeInput
                                selectedItems={selectedDrugs}
                                onAdd={(drug) => {
                                    const dLower = drug.toLowerCase();
                                    if (!selectedDrugs.includes(dLower) && selectedDrugs.length < 20) {
                                        setSelectedDrugs([...selectedDrugs, dLower]);
                                    }
                                    setResult(null);
                                    setAiExplanation(null);
                                }}
                                onRemove={(drug) => {
                                    setSelectedDrugs(selectedDrugs.filter(d => d !== drug));
                                    setResult(null);
                                    setAiExplanation(null);
                                    setFoodWarnings(null);
                                }}
                                label="ADD MEDICATIONS"
                                sublabel="Type a medication name and press Enter or comma to add"
                                confirmationText="✓ {count} medications ready to analyze"
                            />

                            {selectedDrugs.length === 0 && (
                                <div className="mt-4">
                                    <h3 className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-2">
                                        COMMON COMBINATIONS
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { label: "Warfarin + Aspirin", drugs: ["warfarin", "aspirin"] },
                                            { label: "Metformin + Lisinopril", drugs: ["metformin", "lisinopril"] },
                                            { label: "Amiodarone + Warfarin + Digoxin", drugs: ["amiodarone", "warfarin", "digoxin"] },
                                            { label: "Simvastatin + Amlodipine", drugs: ["simvastatin", "amlodipine"] },
                                            { label: "Metoprolol + Verapamil", drugs: ["metoprolol", "verapamil"] },
                                        ].map((preset, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => addPreset(preset.drugs)}
                                                className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer hover:bg-[#EBEBED] transition-colors flex items-center gap-1.5"
                                            >
                                                <Plus size={12} className="text-[#86868B]" />
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-8 border-t border-[#EBEBED] pt-6">
                            <h3 className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-3">
                                SELECT PATIENT (Optional)
                            </h3>
                            <PatientSelector
                                selectedPatient={selectedPatient}
                                onSelectPatient={setSelectedPatient}
                            />
                            <p className="text-xs text-[#86868B] mt-2">Personalizes the risk score to patient physiology</p>
                        </div>

                        <div className="mt-8">
                            {error && <p className="mb-3 text-sm text-[var(--color-danger)]">{error}</p>}
                            <Button
                                className="w-full"
                                size="lg"
                                disabled={selectedDrugs.length < 2 || analyzing}
                                loading={analyzing}
                                onClick={handleAnalyze}
                            >
                                {analyzing ? `Analyzing ${selectedDrugs.length} medications...` : "Analyze Interactions"}
                            </Button>
                        </div>
                    </Card>
                </div>

                {/* Right Panel - Results */}
                <div className="lg:col-span-6 xl:col-span-5 h-full">
                    {!result ? (
                        <div className="h-full min-h-[400px] border-2 border-dashed border-[#EBEBED] rounded-xl flex flex-col items-center justify-center p-8 text-center bg-[#FAFAFA]/50">
                            <Pill size={48} className="text-[#D1D1D6] mb-4" />
                            <p className="text-[#86868B] max-w-xs">Add 2 or more medications and click Analyze to see potential interactions and risk scores.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Score Card */}
                            <Card className="p-8 text-center flex flex-col items-center justify-center">
                                <h3 className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-2">Final Risk Score</h3>
                                <div className="flex items-baseline justify-center gap-1 mb-3">
                                    <span className={`text-[56px] font-bold leading-none`} style={{ color: result?.label_color || '#34C759' }}>
                                        {result?.risk_assessment?.final_score?.toFixed(1) || '0.0'}
                                    </span>
                                    <span className="text-xl text-[#86868B] font-medium">/100</span>
                                </div>
                                <Badge color={result?.risk_assessment?.risk_category === 'Severe' ? 'red' : result?.risk_assessment?.risk_category === 'Moderate' ? 'yellow' : 'green'}>
                                    {result?.risk_assessment?.risk_category || 'Low'} Risk
                                </Badge>
                                <p className="text-sm text-[#86868B] mt-4">
                                    {result?.interaction_analysis?.interactions?.length || 0} interaction(s) detected. Base score: {result?.risk_assessment?.base_interaction_score?.toFixed(1) || '0.0'}
                                </p>
                            </Card>

                            {/* Risk Factors */}
                            <Card className="overflow-hidden">
                                <button
                                    className="w-full px-5 py-4 flex justify-between items-center bg-white hover:bg-[#F9F9FB] transition-colors"
                                    onClick={() => setFactorsOpen(!factorsOpen)}
                                >
                                    <h3 className="font-semibold text-[#1D1D1F]">Risk Factors</h3>
                                    <ChevronDown size={16} className={`text-[#86868B] transition-transform ${factorsOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {factorsOpen && (
                                    <div className="px-5 pb-4 border-t border-[#EBEBED]">
                                        <div className="pt-2">
                                            {Object.entries(result?.risk_assessment?.multipliers || {}).map(([key, val]) => {
                                                if (key === 'combined') return null;
                                                return (
                                                    <div key={key} className="flex justify-between items-center py-2 border-b border-[#EBEBED] last:border-0">
                                                        <span className="text-sm text-[#515154] capitalize">{key.replace('_', ' ')}</span>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xs text-[#86868B]">{val?.explanation || ''}</span>
                                                            <span className={`text-sm font-semibold ${(val?.value || 1) > 1.0 ? 'text-[#FF9500]' : 'text-[#86868B]'}`}>×{(val?.value || 1).toFixed(1)}</span>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </Card>

                            {/* Clinical Flags */}
                            {result?.risk_assessment?.clinical_flags && result.risk_assessment.clinical_flags.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-[#1D1D1F] mb-3 px-1">Clinical Flags</h3>
                                    <div className="space-y-2">
                                        {result.risk_assessment.clinical_flags.map((flag, idx) => (
                                            <div key={idx} className="bg-white border border-[#EBEBED] border-l-2 border-l-[#FF3B30] rounded-lg p-3 flex gap-3 shadow-sm">
                                                <AlertTriangle size={16} className="text-[#FF3B30] shrink-0 mt-0.5" />
                                                <p className="text-sm text-[#1D1D1F] leading-tight">{flag}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Tabs */}
                            <div className="flex border-b border-[#EBEBED] mb-6 whitespace-nowrap overflow-x-auto overflow-y-hidden">
                                {[
                                    { id: 'interactions', label: 'Interactions' },
                                    { id: 'ai_reasoning', label: 'AI Reasoning' },
                                    { id: 'recommendations', label: 'Recommendations' },
                                    { id: 'food_warnings', label: 'Food Warnings' },
                                    { id: 'drug_info', label: 'Drug Info' }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[1px] ${activeTab === tab.id
                                            ? 'border-[#0EA5E9] text-[#0EA5E9]'
                                            : 'border-transparent text-[#86868B] hover:text-[#1D1D1F]'
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Tab Content */}
                            {activeTab === 'interactions' && (
                                <div>
                                    <h3 className="text-sm font-semibold text-[#1D1D1F] mb-3 px-1">Detected Interactions ({result?.interaction_analysis?.interactions?.length || 0})</h3>
                                    {(result?.interaction_analysis?.interactions?.length || 0) === 0 ? (
                                        <div className="bg-[#F5F5F7] rounded-lg p-4 flex items-center gap-3">
                                            <CheckCircle size={20} className="text-[#34C759]" />
                                            <p className="text-sm text-[#515154]">No known interactions detected between these medications.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {(result?.interaction_analysis?.interactions || []).map((interaction, idx) => {
                                                let sevColorCode = '#34C759';
                                                if (interaction.severity === 'Major' || interaction.severity === 'Contraindicated') sevColorCode = '#FF3B30';
                                                if (interaction.severity === 'Moderate') sevColorCode = '#FF9500';

                                                return (
                                                    <div key={idx} className="bg-white rounded-r-lg border border-l-0 border-[#EBEBED] shadow-sm py-3 px-4 relative">
                                                        <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg" style={{ backgroundColor: sevColorCode }}></div>

                                                        <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                                                            <h4 className="font-semibold text-sm text-[#1D1D1F]">{interaction.drug1} + {interaction.drug2}</h4>
                                                            <Badge color={sevColorCode === '#FF3B30' ? 'red' : sevColorCode === '#FF9500' ? 'yellow' : 'green'}>
                                                                {interaction.severity || 'Unknown'}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-xs text-[#515154] mb-1 leading-snug">{interaction.mechanism || interaction.description}</p>
                                                        {interaction.recommendation && (
                                                            <p className="text-xs text-[#86868B] italic leading-snug mb-2">{interaction.recommendation}</p>
                                                        )}
                                                        <p className="text-[10px] text-[#A1A1A6] mt-2">Source: {interaction.source}</p>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'ai_reasoning' && (
                                <CoTExplanation
                                    steps={aiExplanation?.cot_explanation?.steps || []}
                                    loading={aiLoading}
                                    error={aiExplanation?.cot_explanation?.error}
                                    modelUsed={aiExplanation?.cot_explanation?.model_used}
                                    deepResearch={aiExplanation?.deep_research}
                                    deepResearchLoading={aiLoading}
                                />
                            )}

                            {activeTab === 'recommendations' && (
                                <div>
                                    {result.recommendations && result.recommendations.length > 0 ? (
                                        <div className="space-y-4">
                                            {result.recommendations.map((rec, idx) => (
                                                <RecommendationCard key={idx} recommendation={rec} />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-[#F4FCE3] border border-[#D8F3AA] rounded-xl p-5 flex gap-4">
                                            <CheckCircle size={20} className="text-[#34C759] shrink-0 mt-0.5" />
                                            <div>
                                                <h4 className="font-semibold text-[#1D1D1F]">No safer alternatives needed</h4>
                                                <p className="text-sm text-[#515154] mt-1">Current medications are optimal based on the detected interaction severity.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'food_warnings' && (
                                <div className="space-y-6">
                                    {foodWarnings && foodWarnings.foods_to_avoid && foodWarnings.foods_to_avoid.length > 0 ? (
                                        <>
                                            {foodWarnings.has_major_warnings && (
                                                <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-4 py-3 mb-2 flex items-center">
                                                    <AlertTriangle size={16} className="text-[#EF4444] shrink-0" />
                                                    <p className="text-sm text-[#EF4444] font-medium ml-2">Major food interactions detected. Patient counseling highly recommended.</p>
                                                </div>
                                            )}

                                            <div className="space-y-3">
                                                {foodWarnings.foods_to_avoid.map((food, idx) => {
                                                    const borderColor = food.severity === 'major' ? '#EF4444' : food.severity === 'moderate' ? '#F59E0B' : '#10B981';

                                                    return (
                                                        <Card key={idx} className="relative py-3 px-4 border border-[#EBEBED] rounded-lg shadow-sm" style={{ borderLeft: `3px solid ${borderColor}` }}>
                                                            <div className="flex items-start">
                                                                <span className="text-xl mr-3 mt-0.5 shrink-0">{food.emoji}</span>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">{food.food}</h4>
                                                                        <Badge color={food.severity === 'major' ? 'red' : food.severity === 'moderate' ? 'yellow' : 'green'}>{food.severity}</Badge>
                                                                    </div>
                                                                    <div className="flex flex-wrap items-center mt-1 mb-2">
                                                                        <span className="text-xs text-[var(--color-text-muted)] mr-1.5 shrink-0">Affects:</span>
                                                                        {food.affects_drugs.map((drug) => (
                                                                            <span key={drug} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full px-2 py-0.5 text-xs font-medium text-[var(--color-text-primary)] mr-1 mb-1 capitalize">
                                                                                {drug}
                                                                            </span>
                                                                        ))}
                                                                    </div>

                                                                    <div className="bg-[var(--color-surface)] rounded-md px-3 py-2 mt-2 mb-2 border border-[#EBEBED]">
                                                                        <p className="text-xs text-[#515154] font-medium mb-1">Clinical Mechanism:</p>
                                                                        <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{food.why}</p>
                                                                    </div>

                                                                    <div className="flex items-center mt-2">
                                                                        <Check size={14} className="text-[#34C759] shrink-0 mr-2" />
                                                                        <p className="text-sm font-medium text-[var(--color-text-secondary)]">Patient advice: <span className="font-normal">{food.advice}</span></p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </Card>
                                                    );
                                                })}
                                            </div>

                                            {/* Breakdown by Medication */}
                                            {foodWarnings.by_drug && Object.keys(foodWarnings.by_drug).length > 0 && (
                                                <div className="mt-8">
                                                    <h3 className="text-[13px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-3 px-1 border-b border-[#EBEBED] pb-2">Breakdown by Medication</h3>
                                                    <div className="space-y-4 mt-4">
                                                        {Object.entries(foodWarnings.by_drug).map(([drug, warnings]) => warnings && warnings.length > 0 && (
                                                            <div key={drug} className="bg-white rounded-lg border border-[#EBEBED] p-4 shadow-sm">
                                                                <h4 className="text-sm font-bold text-[#1D1D1F] capitalize mb-3 inline-block bg-[var(--color-surface)] px-3 py-1 rounded-md border border-[#EBEBED]">{drug}</h4>
                                                                <div className="space-y-1">
                                                                    {warnings.map((w, idx) => (
                                                                        <div key={idx} className="flex justify-between items-center py-2 border-b border-[#F5F5F7] last:border-0">
                                                                            <div className="flex items-center flex-1">
                                                                                <span className="mr-2.5 text-base">{w.emoji}</span>
                                                                                <span className="text-sm font-medium text-[#1D1D1F]">{w.food}</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-3 shrink-0">
                                                                                <p className="text-xs text-[#86868B] max-w-[200px] truncate text-right hidden sm:block" title={w.advice}>{w.advice}</p>
                                                                                <Badge color={w.severity === 'major' ? 'red' : w.severity === 'moderate' ? 'yellow' : 'green'} className="scale-90 origin-right">
                                                                                    {w.severity}
                                                                                </Badge>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-6 text-center flex flex-col items-center">
                                            <div className="w-12 h-12 rounded-full bg-[#DCFCE7] flex items-center justify-center mb-3">
                                                <Check size={24} className="text-[#16A34A]" />
                                            </div>
                                            <h4 className="text-sm font-bold text-[#16A34A]">No significant food interactions detected</h4>
                                            <p className="text-xs text-[#515154] mt-1 max-w-sm">These medications have minimal known significant interactions with common foods.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'drug_info' && (
                                <div className="space-y-4">
                                    {selectedDrugs.map(drug => {
                                        const loading = drugInfoLoading[drug];
                                        const data = drugInfoData[drug];

                                        return (
                                            <Card key={drug} className="p-5">
                                                <h3 className="text-base font-bold text-[#1D1D1F] capitalize mb-3">{drug}</h3>

                                                {loading ? (
                                                    <div className="animate-pulse space-y-2">
                                                        <div className="h-4 bg-[#EBEBED] rounded w-3/4"></div>
                                                        <div className="h-4 bg-[#EBEBED] rounded w-1/2"></div>
                                                    </div>
                                                ) : data ? (
                                                    <div>
                                                        <p className="text-sm text-[#515154] leading-relaxed mb-4">
                                                            {data.ai_summary || 'No summary available.'}
                                                        </p>

                                                        <details className="group">
                                                            <summary className="text-xs font-semibold text-[#0EA5E9] cursor-pointer mb-2">
                                                                View Full FDA Data
                                                            </summary>
                                                            <div className="text-xs text-[#515154] space-y-3 mt-3 px-3 py-3 bg-[#F5F5F7] rounded-lg">
                                                                {data.fda_data?.warnings && (
                                                                    <div><strong className="text-[#1D1D1F]">Warnings:</strong> {data.fda_data.warnings}</div>
                                                                )}
                                                                {data.fda_data?.contraindications && (
                                                                    <div><strong className="text-[#1D1D1F]">Contraindications:</strong> {data.fda_data.contraindications}</div>
                                                                )}
                                                                {data.fda_data?.drug_class?.length > 0 && (
                                                                    <div><strong className="text-[#1D1D1F]">Class:</strong> {data.fda_data.drug_class.join(', ')}</div>
                                                                )}
                                                                {data.fda_data?.route?.length > 0 && (
                                                                    <div><strong className="text-[#1D1D1F]">Route:</strong> {data.fda_data.route.join(', ')}</div>
                                                                )}
                                                            </div>
                                                        </details>
                                                    </div>
                                                ) : null}
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}

                        </div>
                    )}
                </div>
            </div>
        </DoctorLayout>
    );
};

export default DrugAnalyzer;
