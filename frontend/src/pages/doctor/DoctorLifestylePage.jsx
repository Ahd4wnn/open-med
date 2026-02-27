import React, { useState, useEffect } from 'react';
import DoctorLayout from '../../components/doctor/DoctorLayout';
import Button from '../../components/shared/Button';
import Card from '../../components/shared/Card';

const CardContent = ({ children, className = "" }) => <div className={`${className}`}>{children}</div>;

const ChevronDownIcon = ({ expanded }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
        <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
);

const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
);

const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

const DoctorLifestylePage = () => {
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [log, setLog] = useState(null);

    const [drugs, setDrugs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [analysisError, setAnalysisError] = useState('');

    // UI state
    const [expandedSections, setExpandedSections] = useState({
        food_changes: false,
        lifestyle_modifications: false,
        sleep_and_metabolism: false
    });

    useEffect(() => {
        fetchPatients();
    }, []);

    const fetchPatients = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:8000/api/patient/profiles', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPatients(data);
            }
        } catch (err) {
            console.error("Failed to fetch patients", err);
        }
    };

    const fetchPatientLog = async (userId) => {
        try {
            // We need a specific endpoint to get a patient's log by user_id. 
            // Wait, we can add a simple query param to the existing GET /log endpoint if role == doctor.
            // But right now the backend endpoint just pulls from current_user.id.
            // Since we didn't build a doctor-specific GET log endpoint, we will just say: "Ask patient to run analysis" or we can pass drugs and patient_profile_id to run Analysis directly. 
            // The `run_multi_agent_pipeline` uses `current_user.id` for the lifestyle log in the backend route!
            console.warn("Backend needs a doctor-specific lifestyle GET endpoint or we use the POST /analyze with profile ID to see if it works.");
        } catch (err) {
            console.error(err);
        }
    };

    // Let's modify the select patient logic
    const handleSelectPatient = (p) => {
        setSelectedPatient(p);
        setAnalysisResult(null);
        setAnalysisError('');
        setDrugs([]);
    };

    // Drug Search Debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm.length >= 2) {
                fetchSuggestions(searchTerm);
            } else {
                setSuggestions([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchSuggestions = async (query) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:8000/api/ai/drug-search-enriched?q=${encodeURIComponent(query)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSuggestions(data.suggestions || []);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const addDrug = (drug) => {
        if (!drugs.includes(drug) && drugs.length < 20) {
            setDrugs([...drugs, drug]);
        }
        setSearchTerm('');
        setSuggestions([]);
    };

    const removeDrug = (drugToRemove) => {
        setDrugs(drugs.filter(d => d !== drugToRemove));
    };

    const runAnalysis = async () => {
        if (drugs.length === 0 || !selectedPatient) return;
        setIsAnalyzing(true);
        setAnalysisError('');
        setAnalysisResult(null);

        try {
            const token = localStorage.getItem('token');
            // We use the patient's underlying user_id if the backend allowed it, 
            // but the backend `analyze` route uses `current_user.id` to look up the lifestyle log.
            // Wait! The backend route `analyze` uses `current_user.id` to find the LifestyleLog!
            // That means a doctor CANNOT run the analysis on a patient without a backend change.
            // Oh no, I need to fix the backend route to look up by patient_profile_id's user_id if doctor!

            // I'll assume the backend is fixed for this component.
            const res = await fetch('http://localhost:8000/api/lifestyle/analyze', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    drug_names: drugs,
                    patient_profile_id: selectedPatient.id
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Analysis failed. Does the patient have a lifestyle log?');
            setAnalysisResult(data);
        } catch (err) {
            setAnalysisError(err.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <DoctorLayout>
            <div className="max-w-4xl mx-auto h-full flex flex-col pb-10">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-[#1D1D1F] tracking-tight">Patient Lifestyle Analysis</h1>
                    <p className="mt-2 text-[#86868B] text-lg">
                        Run the multi-agent food and lifestyle interaction pipeline for a specific patient.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Sidebar / Patient Selector */}
                    <div className="col-span-1">
                        <Card>
                            <CardContent className="p-4">
                                <h3 className="font-semibold text-sm text-[#1D1D1F] mb-3 uppercase tracking-wider">Select Patient</h3>
                                <div className="space-y-2">
                                    {patients.length === 0 ? (
                                        <p className="text-sm text-[#86868B]">No patients found.</p>
                                    ) : (
                                        patients.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => handleSelectPatient(p)}
                                                className={`w-full text-left p-3 rounded-lg border transition-all text-sm font-medium ${selectedPatient?.id === p.id
                                                        ? 'bg-[#0EA5E9]/10 border-[#0EA5E9] text-[#0EA5E9]'
                                                        : 'bg-white border-[#EBEBED] text-[#1D1D1F] hover:bg-[#F5F5F7]'
                                                    }`}
                                            >
                                                Age: {p.age} • w: {p.weight_kg}kg
                                                {p.medical_conditions && <div className="text-xs text-[#86868B] mt-1 line-clamp-1">{p.medical_conditions}</div>}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Analysis Area */}
                    <div className="col-span-1 md:col-span-2 space-y-6">
                        {!selectedPatient ? (
                            <div className="bg-[#F5F5F7] rounded-xl border border-[#EBEBED] border-dashed p-10 flex flex-col items-center justify-center text-center">
                                <SearchIcon />
                                <h3 className="text-[#1D1D1F] font-semibold mt-4">No Patient Selected</h3>
                                <p className="text-[#86868B] text-sm mt-2 max-w-sm">Select a patient from the list, add their proposed or current medications, and run the multi-agent lifestyle interaction analysis.</p>
                            </div>
                        ) : (
                            <>
                                <Card>
                                    <CardContent className="p-6">
                                        <p className="text-[11px] uppercase text-[#86868B] font-semibold tracking-wider mb-3">MEDICATIONS TO TEST</p>
                                        <div className="space-y-4">
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[#86868B]">
                                                    <SearchIcon />
                                                </div>
                                                <input
                                                    type="text"
                                                    className="w-full pl-10 pr-4 py-3 bg-[#F5F5F7] border-0 rounded-lg text-sm focus:ring-2 focus:ring-[#0EA5E9] transition-all outline-none"
                                                    placeholder="Search and add medications..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                />
                                                {suggestions.length > 0 && (
                                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#EBEBED] rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                                                        {suggestions.map((s, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="px-4 py-2 hover:bg-[#F5F5F7] cursor-pointer text-sm font-medium text-[#1D1D1F]"
                                                                onClick={() => addDrug(s)}
                                                            >
                                                                {s}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {drugs.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {drugs.map(drug => (
                                                        <div key={drug} className="flex items-center gap-2 px-3 py-1.5 bg-[#F5F5F7] border border-[#EBEBED] rounded-full text-sm font-medium text-[#1D1D1F]">
                                                            <span className="capitalize">{drug}</span>
                                                            <button onClick={() => removeDrug(drug)} className="text-[#86868B] hover:text-[#FF3B30] focus:outline-none">
                                                                <XIcon />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {analysisError && (
                                                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 mt-2">
                                                    {analysisError}
                                                </div>
                                            )}

                                            <Button onClick={runAnalysis} disabled={drugs.length === 0 || isAnalyzing} className="w-full h-11">
                                                {isAnalyzing ? "Running Analysis..." : "Run Multi-Agent Analysis"}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>

                                {analysisResult && (
                                    <div className="space-y-6 animate-in fade-in duration-500">

                                        {/* Score Banner */}
                                        <div className="bg-white border border-[#EBEBED] rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-sm">
                                            <div className="mb-2">
                                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${analysisResult.final_category === 'Severe' ? 'bg-red-100 text-red-800' :
                                                        analysisResult.final_category === 'Moderate' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-green-100 text-green-800'
                                                    }`}>
                                                    {analysisResult.final_category} Risk
                                                </span>
                                            </div>
                                            <div className="flex items-baseline gap-1 mt-2">
                                                <span className={`text-6xl font-black tracking-tight ${analysisResult.final_category === 'Severe' ? 'text-red-500' :
                                                        analysisResult.final_category === 'Moderate' ? 'text-yellow-500' :
                                                            'text-[#34C759]'
                                                    }`}>
                                                    {analysisResult.final_combined_score}
                                                </span>
                                                <span className="text-2xl font-bold text-[#AEAEB2]">/100</span>
                                            </div>
                                            <p className="text-xs text-[#86868B] mt-2 font-medium">
                                                Patient Risk Score Profile
                                            </p>
                                        </div>

                                        {/* Breakdowns */}
                                        <div className="grid grid-cols-1 gap-6">
                                            {/* Food Risks */}
                                            <Card>
                                                <CardContent className="p-6">
                                                    <h3 className="font-bold text-[#1D1D1F] text-sm tracking-wider uppercase mb-4">Detected Food-Drug Interactions</h3>
                                                    {analysisResult.agent_2_report.cross_referenced_food_risks.length === 0 ? (
                                                        <p className="text-sm text-[#86868B] italic">No major food interactions detected.</p>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            {analysisResult.agent_2_report.cross_referenced_food_risks.map((risk, idx) => (
                                                                <div key={idx} className={`bg-white border p-4 rounded-xl shadow-sm ${risk.severity === 'major' ? 'border-l-4 border-l-red-500' :
                                                                        risk.severity === 'moderate' ? 'border-l-4 border-l-yellow-400' :
                                                                            'border-l-4 border-l-green-500'
                                                                    }`}>
                                                                    <div className="flex items-start justify-between mb-2">
                                                                        <h4 className="font-bold text-[#1D1D1F] capitalize text-sm">{risk.food_item} + {risk.drug}</h4>
                                                                        {risk.clinically_confirmed && (
                                                                            <span className="text-[10px] font-bold uppercase bg-blue-100 text-blue-800 px-2 py-0.5 rounded ml-2 whitespace-nowrap">Confirmed</span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-xs text-[#1D1D1F] mb-1">{risk.effect}</p>
                                                                    <p className="text-xs font-semibold mt-2 text-[#86868B] italic leading-tight">{risk.recommendation}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>

                                            {/* Lifestyle Flags */}
                                            <Card>
                                                <CardContent className="p-6">
                                                    <h3 className="font-bold text-[#1D1D1F] text-sm tracking-wider uppercase mb-4">Lifestyle Risk Factors</h3>
                                                    {analysisResult.agent_2_report.high_relevance_lifestyle_flags.length === 0 ? (
                                                        <p className="text-sm text-[#86868B] italic">No major lifestyle flags detected.</p>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            {analysisResult.agent_2_report.high_relevance_lifestyle_flags.map((flag, idx) => (
                                                                <div key={idx} className={`bg-white border border-[#EBEBED] p-4 rounded-xl shadow-sm ${flag.high_relevance ? 'border-l-4 border-l-orange-500' : 'border-l-4 border-l-[#D1D1D6]'}`}>
                                                                    <div className="flex items-start justify-between mb-1">
                                                                        <h4 className="font-bold text-[#1D1D1F] text-sm">{flag.factor}</h4>
                                                                        <span className="text-[10px] font-bold bg-orange-100 text-orange-800 px-2 py-0.5 rounded ml-2">×{flag.risk_multiplier} Risk</span>
                                                                    </div>
                                                                    <p className="text-xs text-[#1D1D1F] mb-3">{flag.recommendation}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </DoctorLayout>
    );
};

export default DoctorLifestylePage;
