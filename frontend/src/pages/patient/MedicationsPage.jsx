import React, { useState, useEffect, useRef } from 'react';
import PatientLayout from '../../components/patient/PatientLayout';
import Card from '../../components/shared/Card';
import Badge from '../../components/shared/Badge';
import Button from '../../components/shared/Button';
import Input from '../../components/shared/Input';
import CoTExplanation from '../../components/shared/CoTExplanation';
import RecommendationCard from '../../components/shared/RecommendationCard';
import { interactionService, riskService, aiService } from '../../services/api';

const MedicationsPage = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [selectedDrugs, setSelectedDrugs] = useState([]);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('summary');
    const [cotData, setCotData] = useState(null);
    const [cotLoading, setCotLoading] = useState(false);
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
                const res = await aiService.searchDrugsEnriched(searchQuery);
                setSuggestions(res.data.suggestions || []);
            } catch (err) {
                console.error("Drug search error", err);
            }
        }, 400);

        return () => clearTimeout(searchTimeoutRef.current);
    }, [searchQuery]);

    const handleAddDrug = (drugName) => {
        if (!selectedDrugs.includes(drugName)) {
            setSelectedDrugs([...selectedDrugs, drugName]);
            setResult(null); // Clear previous results if we add a new drug
        }
        setSearchQuery('');
        setSuggestions([]);
    };

    const handleRemoveDrug = (drugName) => {
        setSelectedDrugs(selectedDrugs.filter(d => d !== drugName));
        setResult(null);
    };

    const handleAnalyze = async () => {
        if (selectedDrugs.length < 2) return;

        setError('');
        setAnalyzing(true);
        try {
            // patientId is null here since we'll rely on the backend 
            // risk assessment combining the authenticated user's profile
            const res = await riskService.assess(selectedDrugs);
            setResult(res.data);
            setActiveTab('summary');
            setCotData(null);

            // Automatically fetch CoT analysis for patients to provide the plain-English summary
            if (res.data.assessment_id) {
                fetchCoT(res.data.assessment_id);
            }
        } catch (err) {
            setError('Analysis failed. Please try again.');
        } finally {
            setAnalyzing(false);
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
        setSearchQuery('');
        setError('');
    };

    return (
        <PatientLayout>
            <div className="mb-8">
                <h1 className="text-[28px] font-bold text-[var(--color-text-primary)]">Check Your Medications</h1>
                <p className="text-[var(--color-text-secondary)] mt-1">Enter your current medications to check for interactions.</p>
            </div>

            <Card className="p-6 mb-8">
                <h2 className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-4">Your Medications</h2>

                <div className="relative mb-6">
                    <Input
                        placeholder="Search for a medication..."
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

                {selectedDrugs.length > 0 && (
                    <div className="mb-6">
                        <div className="flex flex-wrap gap-2">
                            {selectedDrugs.map(drug => (
                                <div key={drug} className="flex items-center gap-2 bg-white border border-[#EBEBED] rounded-full pl-4 pr-2 py-1.5 text-sm font-medium text-[var(--color-text-primary)] shadow-sm">
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
                        {selectedDrugs.length >= 2 && (
                            <p className="text-xs font-medium text-[#0EA5E9] mt-3">
                                ✓ Ready to analyze {selectedDrugs.length} medications
                            </p>
                        )}
                    </div>
                )}

                {error && <p className="mb-4 text-sm text-[var(--color-danger)]">{error}</p>}

                <Button
                    className="w-full text-base py-3 h-auto"
                    disabled={selectedDrugs.length < 2 || analyzing}
                    loading={analyzing}
                    onClick={handleAnalyze}
                >
                    Check for Interactions
                </Button>
            </Card>

            {/* Results Section */}
            {result && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className={`rounded-xl p-6 mb-6 flex flex-col items-center text-center border ${result.final_risk_category === 'Low' ? 'bg-[#F4FCE3] border-[#D8F3AA]' :
                        result.final_risk_category === 'Severe' ? 'bg-[#FFF0F0] border-[#FFD8D8]' :
                            'bg-[#FFF9EC] border-[#FFE9B8]'
                        }`}>
                        {result.final_risk_category === 'Low' ? (
                            <>
                                <svg className="text-[#34C759] mb-3" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                <h2 className="text-xl font-bold text-[#1D1D1F] mb-2">Your medications appear safe together</h2>
                                <Badge color="green" className="mb-3">Low Risk Score: {result.final_risk_score.toFixed(1)}/100</Badge>
                                <p className="text-sm text-[#515154] max-w-md">We didn't find any major known interactions between these medications based on your health profile.</p>
                            </>
                        ) : (
                            <>
                                <svg className={`mb-3 ${result.final_risk_category === 'Severe' ? 'text-[#FF3B30]' : 'text-[#FF9500]'}`} xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                                <h2 className="text-xl font-bold text-[#1D1D1F] mb-2">Interactions detected — review recommended</h2>
                                <Badge color={result.final_risk_category === 'Severe' ? 'red' : 'yellow'} className="mb-3">
                                    {result.final_risk_category} Risk Score: {result.final_risk_score.toFixed(1)}/100
                                </Badge>
                                <p className="text-sm text-[#515154] max-w-md">We found potential interactions. Please review the details below and consult your doctor before making any changes.</p>
                            </>
                        )}
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
                            {result.interactions.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-[#1D1D1F] mb-3 px-1">What You Should Know</h3>
                                    <div className="space-y-3">
                                        {result.interactions.map((interaction, idx) => {
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
                            {result.clinical_flags && result.clinical_flags.length > 0 && (
                                <div className="mb-8">
                                    <h3 className="text-sm font-semibold text-[#1D1D1F] mb-3 px-1">Profile Alerts</h3>
                                    <div className="space-y-2">
                                        {result.clinical_flags.map((flag, idx) => (
                                            <div key={idx} className="bg-[#FFF0F0] border border-[#FFD8D8] rounded-lg p-3 flex gap-3">
                                                <svg className="text-[#FF3B30] shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                                <p className="text-sm text-[#1D1D1F] leading-tight">{flag}</p>
                                            </div>
                                        ))}
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
                                    steps={cotData?.steps}
                                    loading={cotLoading}
                                    error={cotData?.error}
                                    modelUsed={cotData?.model_used}
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
                                    <svg className="text-[#34C759] shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
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
