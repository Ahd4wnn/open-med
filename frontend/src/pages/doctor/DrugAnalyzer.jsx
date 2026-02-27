import React, { useState, useEffect, useRef } from 'react';
import DoctorLayout from '../../components/doctor/DoctorLayout';
import Card from '../../components/shared/Card';
import Badge from '../../components/shared/Badge';
import Button from '../../components/shared/Button';
import Input from '../../components/shared/Input';
import CoTExplanation from '../../components/shared/CoTExplanation';
import RecommendationCard from '../../components/shared/RecommendationCard';
import { interactionService, riskService, aiService } from '../../services/api';

const DrugAnalyzer = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [selectedDrugs, setSelectedDrugs] = useState([]);
    const [patientId, setPatientId] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState('');
    const [factorsOpen, setFactorsOpen] = useState(true);
    const [activeTab, setActiveTab] = useState('interactions');
    const [cotData, setCotData] = useState(null);
    const [cotLoading, setCotLoading] = useState(false);
    const [drugInfoData, setDrugInfoData] = useState({});
    const [drugInfoLoading, setDrugInfoLoading] = useState({});
    const [result, setResult] = useState(null);
    const searchTimeoutRef = useRef(null);

    useEffect(() => {
        if (!searchQuery) {
            setSuggestions([]);
            return;
        }

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const data = await aiService.searchDrugsEnriched(searchQuery);
                setSuggestions(data.suggestions || []);
            } catch (err) {
                console.error("Drug search error", err);
            }
        }, 400);

        return () => clearTimeout(searchTimeoutRef.current);
    }, [searchQuery]);

    const handleAddDrug = (drugName) => {
        if (!selectedDrugs.includes(drugName)) {
            setSelectedDrugs([...selectedDrugs, drugName]);
        }
        setSearchQuery('');
        setSuggestions([]);
    };

    const handleRemoveDrug = (drugName) => {
        setSelectedDrugs(selectedDrugs.filter(d => d !== drugName));
        setResult(null); // Clear previous results when modifying list
    };

    const handleAnalyze = async () => {
        if (selectedDrugs.length < 2) return;

        setError('');
        setAnalyzing(true);
        try {
            const pId = patientId ? parseInt(patientId, 10) : null;
            const data = await riskService.assess(selectedDrugs, isNaN(pId) ? null : pId);
            setResult(data);
            setActiveTab('interactions');
            setCotData(null); // reset AI data for new analysis
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
            const data = await aiService.explain(assessmentId);
            setCotData(data);
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
            const data = await aiService.getDrugInfo(drugName);
            setDrugInfoData(prev => ({ ...prev, [drugName]: data }));
        } catch (err) {
            console.error("Drug info fetch error", err);
        } finally {
            setDrugInfoLoading(prev => ({ ...prev, [drugName]: false }));
        }
    };

    useEffect(() => {
        if (activeTab === 'ai_reasoning' && result?.assessment_id) {
            fetchCoT(result.assessment_id);
        }
        if (activeTab === 'drug_info' && selectedDrugs.length > 0) {
            selectedDrugs.forEach(drug => fetchDrugInfo(drug));
        }
    }, [activeTab, result, selectedDrugs]);

    return (
        <DoctorLayout>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">

                {/* Left Panel - Inputs */}
                <div className="lg:col-span-6 xl:col-span-7 flex flex-col gap-6">
                    <Card className="p-6">
                        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-6">Add Medications</h2>

                        <div className="relative mb-6">
                            <Input
                                label="Search Medications"
                                placeholder="Type a drug name... (e.g. Lisinopril, Warfarin)"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {suggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#EBEBED] rounded-lg shadow-lg z-50 max-h-[280px] overflow-y-auto">
                                    {suggestions.map((drug, idx) => (
                                        <div
                                            key={idx}
                                            className="px-4 py-3 hover:bg-[#F5F5F7] cursor-pointer flex items-center gap-3 transition-colors border-b border-[#EBEBED] last:border-0"
                                            onClick={() => handleAddDrug(drug)}
                                        >
                                            <svg className="text-[#86868B]" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.5 20.5 7 24l-3-3L.5 17.5M10.5 20.5l4-4L11 13l-4 4-3.5 3.5M10.5 20.5l3.5-3.5"></path><path d="M14.5 16.5l3.5-3.5L14 9l-3.5 3.5"></path><path d="M18 13l3.5-3.5a3.536 3.536 0 0 0-5-5L13 8l5 5z"></path></svg>
                                            <span className="text-sm text-[var(--color-text-primary)]">{drug}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <h3 className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-3">
                                Selected Medications ({selectedDrugs.length})
                            </h3>
                            {selectedDrugs.length === 0 ? (
                                <p className="text-sm text-[#86868B]">No medications added yet.</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {selectedDrugs.map(drug => (
                                        <div key={drug} className="flex items-center gap-2 bg-white border border-[#EBEBED] rounded-full pl-3 pr-1 py-1 text-sm font-medium text-[var(--color-text-primary)] shadow-sm">
                                            {drug}
                                            <button
                                                onClick={() => handleRemoveDrug(drug)}
                                                className="p-1 text-[#86868B] hover:text-[#FF3B30] transition-colors rounded-full"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-8 border-t border-[#EBEBED] pt-6">
                            <h3 className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-3">
                                Patient Context (Optional)
                            </h3>
                            <Input
                                type="number"
                                placeholder="Patient Profile ID"
                                value={patientId}
                                onChange={(e) => setPatientId(e.target.value)}
                                hint="Add a patient ID to personalize the risk score based on age and vitals."
                            />
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
                                Analyze Interactions
                            </Button>
                        </div>
                    </Card>
                </div>

                {/* Right Panel - Results */}
                <div className="lg:col-span-6 xl:col-span-5 h-full">
                    {!result ? (
                        <div className="h-full min-h-[400px] border-2 border-dashed border-[#EBEBED] rounded-xl flex flex-col items-center justify-center p-8 text-center bg-[#FAFAFA]/50">
                            <svg className="text-[#D1D1D6] mb-4" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.5 20.5 7 24l-3-3L.5 17.5M10.5 20.5l4-4L11 13l-4 4-3.5 3.5M10.5 20.5l3.5-3.5"></path><path d="M14.5 16.5l3.5-3.5L14 9l-3.5 3.5"></path><path d="M18 13l3.5-3.5a3.536 3.536 0 0 0-5-5L13 8l5 5z"></path></svg>
                            <p className="text-[#86868B] max-w-xs">Add 2 or more medications and click Analyze to see potential interactions and risk scores.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Score Card */}
                            <Card className="p-8 text-center flex flex-col items-center justify-center">
                                <h3 className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-2">Final Risk Score</h3>
                                <div className="flex items-baseline justify-center gap-1 mb-3">
                                    <span className={`text-[56px] font-bold leading-none`} style={{ color: result.label_color }}>
                                        {result.final_risk_score.toFixed(1)}
                                    </span>
                                    <span className="text-xl text-[#86868B] font-medium">/100</span>
                                </div>
                                <Badge color={result.final_risk_category === 'Severe' ? 'red' : result.final_risk_category === 'Moderate' ? 'yellow' : 'green'}>
                                    {result.final_risk_category} Risk
                                </Badge>
                                <p className="text-sm text-[#86868B] mt-4">
                                    {result.interactions.length} interaction(s) detected. Base score: {result.base_interaction_score.toFixed(1)}
                                </p>
                            </Card>

                            {/* Risk Factors */}
                            <Card className="overflow-hidden">
                                <button
                                    className="w-full px-5 py-4 flex justify-between items-center bg-white hover:bg-[#F9F9FB] transition-colors"
                                    onClick={() => setFactorsOpen(!factorsOpen)}
                                >
                                    <h3 className="font-semibold text-[#1D1D1F]">Risk Factors</h3>
                                    <svg className={`text-[#86868B] transition-transform ${factorsOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                </button>

                                {factorsOpen && (
                                    <div className="px-5 pb-4 border-t border-[#EBEBED]">
                                        <div className="pt-2">
                                            {Object.entries(result.multipliers).map(([key, val]) => (
                                                <div key={key} className="flex justify-between items-center py-2 border-b border-[#EBEBED] last:border-0">
                                                    <span className="text-sm text-[#515154] capitalize">{key.replace('_', ' ')}</span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs text-[#86868B]">{result.explainability[key]}</span>
                                                        <span className={`text-sm font-semibold ${val > 1.0 ? 'text-[#FF9500]' : 'text-[#86868B]'}`}>×{val.toFixed(1)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </Card>

                            {/* Clinical Flags */}
                            {result.clinical_flags && result.clinical_flags.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-semibold text-[#1D1D1F] mb-3 px-1">Clinical Flags</h3>
                                    <div className="space-y-2">
                                        {result.clinical_flags.map((flag, idx) => (
                                            <div key={idx} className="bg-white border border-[#EBEBED] border-l-2 border-l-[#FF3B30] rounded-lg p-3 flex gap-3 shadow-sm">
                                                <svg className="text-[#FF3B30] shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                                                <p className="text-sm text-[#1D1D1F] leading-tight">{flag}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Tabs */}
                            <div className="flex border-b border-[#EBEBED] mb-6">
                                {[
                                    { id: 'interactions', label: 'Interactions' },
                                    { id: 'ai_reasoning', label: 'AI Reasoning' },
                                    { id: 'recommendations', label: 'Recommendations' },
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
                                    <h3 className="text-sm font-semibold text-[#1D1D1F] mb-3 px-1">Detected Interactions ({result.interactions.length})</h3>
                                    {result.interactions.length === 0 ? (
                                        <div className="bg-[#F5F5F7] rounded-lg p-4 flex items-center gap-3">
                                            <svg className="text-[#34C759]" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                            <p className="text-sm text-[#515154]">No known interactions detected between these medications.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {result.interactions.map((interaction, idx) => {
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
                                    steps={cotData?.steps}
                                    loading={cotLoading}
                                    error={cotData?.error}
                                    modelUsed={cotData?.model_used}
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
                                            <svg className="text-[#34C759] shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                            <div>
                                                <h4 className="font-semibold text-[#1D1D1F]">No safer alternatives needed</h4>
                                                <p className="text-sm text-[#515154] mt-1">Current medications are optimal based on the detected interaction severity.</p>
                                            </div>
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
