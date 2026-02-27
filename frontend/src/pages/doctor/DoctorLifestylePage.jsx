import React, { useState, useEffect } from 'react';
import DoctorLayout from '../../components/doctor/DoctorLayout';
import Card from '../../components/shared/Card';
import FreeTypeInput from '../../components/shared/FreeTypeInput';
import PatientSelector from '../../components/shared/PatientSelector';
import Button from '../../components/shared/Button';
import Badge from '../../components/shared/Badge';
import { Leaf, Utensils, PlusCircle, ChevronDown, AlertCircle, AlertTriangle } from 'lucide-react';

const LeafIcon = () => <Leaf color="#D1D1D6" size={48} strokeWidth={2} />;
const ForkIcon = () => <Utensils className="text-[#0EA5E9]" size={18} />;
const CrossIcon = () => <PlusCircle className="text-[#0EA5E9]" size={18} />;
const ChevronIcon = ({ expanded }) => <ChevronDown size={16} style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />;

const DoctorLifestylePage = () => {
    const [selectedPatient, setSelectedPatient] = useState(null);

    const [selectedDrugs, setSelectedDrugs] = useState([]);
    // State for FreeTypeInput is internal to the component, so we just track the list

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [analysisResult, setAnalysisResult] = useState(null);

    const [expandedSections, setExpandedSections] = useState({
        food_changes: true,
        lifestyle_modifications: true,
        sleep_and_metabolism: true,
        agentDetails: true
    });

    const addDrug = (drug) => {
        const dLower = drug.toLowerCase();
        if (!selectedDrugs.includes(dLower) && selectedDrugs.length < 20) {
            setSelectedDrugs([...selectedDrugs, dLower]);
        }
    };

    const removeDrug = (drugToRemove) => {
        setSelectedDrugs(selectedDrugs.filter(d => d !== drugToRemove));
    };

    const addPreset = (drugList) => {
        const newList = [...new Set([...selectedDrugs, ...drugList])];
        setSelectedDrugs(newList);
    };

    const runAnalysis = async () => {
        if (selectedDrugs.length === 0) return;
        setLoading(true);
        setError(null);
        setAnalysisResult(null);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:8000/api/lifestyle/analyze', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    drug_names: selectedDrugs,
                    patient_user_id: selectedPatient ? selectedPatient.user_id : null,
                    patient_profile_id: selectedPatient ? selectedPatient.profile_id : null
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Analysis failed.');
            setAnalysisResult(data);
        } catch (err) {
            console.error(err);
            setError(err.message || 'Analysis failed.');
        } finally {
            setLoading(false);
        }
    };

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    return (
        <DoctorLayout>
            <div className="h-full flex flex-col pb-10">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-[#1D1D1F] tracking-tight">Lifestyle Analysis</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
                    {/* Left Panel */}
                    <div className="lg:col-span-6 xl:col-span-5 flex flex-col gap-6">
                        {/* Section 1: Patient Selector */}
                        <Card className="p-6 overflow-visible relative">
                            <h3 className="text-[11px] uppercase tracking-wider text-[#86868B] font-semibold mb-3">SELECT PATIENT</h3>
                            <p className="text-xs text-[#86868B] mb-3">Search and select a patient to analyze</p>

                            <PatientSelector
                                selectedPatient={selectedPatient}
                                onSelectPatient={setSelectedPatient}
                            />
                        </Card>

                        {/* Section 2: Drug Input */}
                        <Card className="p-6">
                            <FreeTypeInput
                                selectedItems={selectedDrugs}
                                onAdd={addDrug}
                                onRemove={removeDrug}
                                label="MEDICATIONS TO ANALYZE"
                                sublabel="Type medications and press Enter to add"
                                confirmationText="✓ {count} medications ready"
                            />

                            <div className="mt-4">
                                <h3 className="text-[10px] uppercase tracking-wider text-[#86868B] font-semibold mb-2">QUICK ADD</h3>
                                <div className="flex flex-wrap gap-2">
                                    <button onClick={() => addPreset(['warfarin', 'aspirin', 'metformin'])} className="bg-[#F5F5F7] border border-[#EBEBED] rounded-lg px-3 py-1.5 text-xs font-medium text-[#1D1D1F] hover:bg-[#EBEBED] transition-colors flex items-center text-left leading-tight">
                                        <span className="mr-1 text-[#86868B]">+</span> Warfarin + Aspirin + Metformin
                                    </button>
                                    <button onClick={() => addPreset(['amiodarone', 'digoxin', 'warfarin'])} className="bg-[#F5F5F7] border border-[#EBEBED] rounded-lg px-3 py-1.5 text-xs font-medium text-[#1D1D1F] hover:bg-[#EBEBED] transition-colors flex items-center text-left leading-tight">
                                        <span className="mr-1 text-[#86868B]">+</span> Amiodarone + Digoxin + Warfarin
                                    </button>
                                    <button onClick={() => addPreset(['simvastatin', 'amlodipine', 'lisinopril'])} className="bg-[#F5F5F7] border border-[#EBEBED] rounded-lg px-3 py-1.5 text-xs font-medium text-[#1D1D1F] hover:bg-[#EBEBED] transition-colors flex items-center text-left leading-tight">
                                        <span className="mr-1 text-[#86868B]">+</span> Simvastatin + Amlodipine + Lisinopril
                                    </button>
                                    <button onClick={() => addPreset(['metformin', 'lisinopril', 'metoprolol'])} className="bg-[#F5F5F7] border border-[#EBEBED] rounded-lg px-3 py-1.5 text-xs font-medium text-[#1D1D1F] hover:bg-[#EBEBED] transition-colors flex items-center text-left leading-tight">
                                        <span className="mr-1 text-[#86868B]">+</span> Metformin + Lisinopril + Metoprolol
                                    </button>
                                </div>
                            </div>

                            <Button onClick={runAnalysis} disabled={selectedDrugs.length < 1 || loading} className="w-full h-12 text-base mt-6">
                                {loading ? (
                                    <div className="flex items-center justify-center">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                        <span>Running multi-agent analysis...</span>
                                    </div>
                                ) : "Run Lifestyle Analysis"}
                            </Button>

                            {error && (
                                <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                                    <span className="text-sm font-medium text-red-800">{String(error).replace("Error: ", "")}</span>
                                </div>
                            )}

                            {!selectedPatient && (
                                <p className="text-xs text-[#FF9F0A] mt-2 italic text-center">
                                    ⚠ No patient selected — analysis will run without patient profile personalization
                                </p>
                            )}
                        </Card>
                    </div>

                    {/* Right Panel */}
                    <div className="lg:col-span-6 xl:col-span-7 flex flex-col gap-6">
                        {!analysisResult && !loading && (
                            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[#EBEBED] rounded-2xl bg-white p-12 text-center py-16">
                                <LeafIcon />
                                <h3 className="text-lg font-semibold text-[#1D1D1F] mt-3">Select a patient and add medications</h3>
                                <p className="text-sm text-[#86868B] mt-1 max-w-sm leading-relaxed">
                                    The multi-agent pipeline will analyze food, lifestyle, and medication interactions together.
                                </p>
                            </div>
                        )}

                        {loading && (
                            <div className="flex-1 flex flex-col items-center justify-center border border-[#EBEBED] rounded-2xl bg-white p-12 h-[400px]">
                                <div className="w-8 h-8 border-4 border-[#F5F5F7] border-t-[#0EA5E9] rounded-full animate-spin"></div>
                                <p className="mt-4 text-sm font-medium text-[#86868B]">Analyzing multi-agent interactions...</p>
                            </div>
                        )}

                        {analysisResult && !loading && (
                            <div className="space-y-4">
                                {/* Agent Pipeline Status Cards */}
                                <div className="flex items-center justify-center gap-3">
                                    <div className="bg-white border border-[#EBEBED] rounded-xl p-4 flex-1 flex flex-col items-center text-center shadow-sm">
                                        <div className="bg-[#E0F2FE] p-2 rounded-full mb-2">
                                            <ForkIcon />
                                        </div>
                                        <div className="text-sm font-semibold text-[#1D1D1F] flex items-center justify-center gap-1">
                                            Food & Lifestyle Agent
                                            <span className="text-[#34C759] font-bold">✓</span>
                                        </div>
                                        <p className="text-xs text-[#86868B] mt-1">
                                            {analysisResult.agent_1_report?.food_risks?.length || 0} food risks · {analysisResult.agent_1_report?.lifestyle_flags?.length || 0} lifestyle flags
                                        </p>
                                    </div>

                                    <div className="text-[#86868B] font-medium px-2">→</div>

                                    <div className="bg-white border border-[#EBEBED] rounded-xl p-4 flex-1 flex flex-col items-center text-center shadow-sm">
                                        <div className="bg-[#E0F2FE] p-2 rounded-full mb-2">
                                            <CrossIcon />
                                        </div>
                                        <div className="text-sm font-semibold text-[#1D1D1F] flex items-center justify-center gap-1">
                                            Medical Context Agent
                                            <span className="text-[#34C759] font-bold">✓</span>
                                        </div>
                                        <p className="text-xs text-[#86868B] mt-1">
                                            Combined score: {analysisResult.agent_2_report?.combined_score}/100
                                        </p>
                                    </div>
                                </div>

                                {/* Combined Risk Score Card */}
                                <Card className="p-6 text-center shadow-sm border border-[#EBEBED]">
                                    <div className="flex flex-col items-center justify-center">
                                        {(() => {
                                            const score = analysisResult.agent_2_report?.combined_score || 0;
                                            let colorClass = "text-[#34C759]";
                                            let catBadge = "Low Risk";
                                            if (score >= 40) { colorClass = "text-[#FF9F0A]"; catBadge = "Moderate Risk"; }
                                            if (score >= 70) { colorClass = "text-[#FF3B30]"; catBadge = "High Risk"; }

                                            return (
                                                <>
                                                    <div className={`text-[56px] font-bold leading-none ${colorClass}`}>
                                                        {score}
                                                    </div>
                                                    <div className="mt-3">
                                                        <Badge category={catBadge.split(' ')[0]} />
                                                    </div>
                                                </>
                                            );
                                        })()}
                                        <p className="text-xs text-[#86868B] mt-4">
                                            {selectedDrugs.length} medication(s) analyzed
                                        </p>
                                        <p className="text-xs text-[#86868B] italic mt-1">
                                            Combined medication + lifestyle risk score
                                        </p>
                                    </div>
                                </Card>

                                {/* AI Lifestyle Report Card */}
                                <Card className="overflow-hidden">
                                    <div className="bg-[#F5F5F7] px-6 py-4 flex items-center justify-between border-b border-[#EBEBED]">
                                        <h3 className="text-[11px] uppercase tracking-wider text-[#0EA5E9] font-bold">AI LIFESTYLE REPORT</h3>
                                        <span className="text-xs font-medium text-[#86868B]">DeepSeek R1 via Featherless</span>
                                    </div>
                                    <div className="p-0">
                                        {['food_changes', 'lifestyle_modifications', 'sleep_and_metabolism'].map((key) => (
                                            analysisResult.patient_translation && analysisResult.patient_translation[key] && (
                                                <div key={key} className="border-b border-[#EBEBED] bg-white last:border-0">
                                                    <div
                                                        className="px-6 py-4 flex justify-between items-center cursor-pointer hover:bg-[#F5F5F7] transition-colors"
                                                        onClick={() => toggleSection(key)}
                                                    >
                                                        <h4 className="text-sm font-semibold text-[#1D1D1F] capitalize">
                                                            {key.replace(/_/g, ' ')}
                                                        </h4>
                                                        <div className="text-[#86868B]">
                                                            <ChevronIcon expanded={expandedSections[key]} />
                                                        </div>
                                                    </div>
                                                    {expandedSections[key] && (
                                                        <div className="px-6 pb-5">
                                                            <div className="text-sm text-[#515154] leading-relaxed space-y-3">
                                                                {analysisResult.patient_translation[key].split('\n').map((para, i) => (
                                                                    para.trim() ? <p key={i}>{para}</p> : null
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        ))}
                                    </div>
                                </Card>

                                {/* Full Agent Details */}
                                <div className="mt-6">
                                    <div
                                        className="flex items-center justify-between cursor-pointer py-2 mb-2"
                                        onClick={() => toggleSection('agentDetails')}
                                    >
                                        <h3 className="font-semibold text-[#1D1D1F]">Agent Analysis Details</h3>
                                        <button className="text-[#86868B] hover:text-[#1D1D1F] p-1 rounded transition-colors">
                                            <ChevronIcon expanded={expandedSections.agentDetails} />
                                        </button>
                                    </div>

                                    {expandedSections.agentDetails && (
                                        <div className="space-y-4">
                                            {/* Agent 1 Details */}
                                            <div className="bg-[#F5F5F7] rounded-xl p-5 border border-[#EBEBED]">
                                                <h4 className="text-[11px] uppercase tracking-wider text-[#86868B] font-bold mb-4">AGENT 1 — FOOD & LIFESTYLE</h4>

                                                <div className="mb-5 border-b border-[#EBEBED] pb-4">
                                                    <h5 className="text-xs font-semibold text-[#1D1D1F] uppercase mb-3">Food Risks</h5>
                                                    {analysisResult.agent_1_report?.food_risks?.length > 0 ? (
                                                        <div className="space-y-3">
                                                            {analysisResult.agent_1_report.food_risks.map((risk, idx) => {
                                                                const colors = {
                                                                    "Moderate": "border-[#FF9F0A]",
                                                                    "Major": "border-[#FF3B30]",
                                                                    "Minor": "border-[#34C759]"
                                                                };
                                                                return (
                                                                    <div key={idx} className={`pl-3 border-l-4 ${colors[risk.severity] || "border-gray-400"}`}>
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <span className="text-sm font-semibold text-[#1D1D1F]">{risk.food_item} + {risk.drug}</span>
                                                                            <Badge category={risk.severity} />
                                                                        </div>
                                                                        <p className="text-xs text-[#515154] mb-1">{risk.effect}</p>
                                                                        <p className="text-xs text-[#86868B] italic">{risk.recommendation}</p>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-[#86868B]">No food-drug interactions detected.</p>
                                                    )}
                                                </div>

                                                <div>
                                                    <h5 className="text-xs font-semibold text-[#1D1D1F] uppercase mb-3">Lifestyle Flags</h5>
                                                    {analysisResult.agent_1_report?.lifestyle_flags?.length > 0 ? (
                                                        <div className="space-y-2">
                                                            {analysisResult.agent_1_report.lifestyle_flags.map((flag, idx) => (
                                                                <div key={idx} className="flex flex-col sm:flex-row sm:items-center py-2 border-b border-[#EBEBED] last:border-0 gap-2 sm:gap-0">
                                                                    <div className="flex items-center">
                                                                        <span className="text-sm font-medium text-[#1D1D1F] capitalize">{flag.factor.replace(/_/g, ' ')}</span>
                                                                        <span className="text-[10px] font-bold bg-[#FFF4E5] text-[#FF9F0A] px-1.5 py-0.5 rounded ml-2 whitespace-nowrap">
                                                                            ×{flag.risk_multiplier}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-xs text-[#515154] sm:ml-auto ml-0 max-w-xs">{flag.recommendation}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-[#86868B]">No problematic lifestyle factors detected.</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Agent 2 Details */}
                                            <div className="bg-[#F5F5F7] rounded-xl p-5 border border-[#EBEBED]">
                                                <h4 className="text-[11px] uppercase tracking-wider text-[#86868B] font-bold mb-4">AGENT 2 — MEDICAL CONTEXT</h4>

                                                <div className="flex flex-wrap gap-4 mb-5 border-b border-[#EBEBED] pb-4">
                                                    <div className="flex-1 min-w-[100px]">
                                                        <div className="text-xl font-bold text-[#1D1D1F]">{analysisResult.agent_2_report?.medication_risk_score}</div>
                                                        <div className="text-[10px] uppercase text-[#86868B] font-semibold mt-1">Medication Risk</div>
                                                    </div>
                                                    <div className="flex-1 min-w-[100px]">
                                                        <div className="text-xl font-bold text-[#FF9F0A]">+{analysisResult.agent_2_report?.lifestyle_risk_contribution}</div>
                                                        <div className="text-[10px] uppercase text-[#86868B] font-semibold mt-1">Lifestyle Contribution</div>
                                                    </div>
                                                    <div className="flex-1 min-w-[100px]">
                                                        <div className="text-xl font-bold text-[#1D1D1F]">{analysisResult.agent_2_report?.combined_score}/100</div>
                                                        <div className="text-[10px] uppercase text-[#86868B] font-semibold mt-1">Combined</div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <h5 className="text-[10px] uppercase tracking-wider text-[#86868B] font-bold mb-3">HIGH RELEVANCE FLAGS</h5>
                                                    {analysisResult.agent_2_report?.high_relevance_flags?.length > 0 ? (
                                                        <div className="space-y-2">
                                                            {analysisResult.agent_2_report.high_relevance_flags.map((flag, idx) => (
                                                                <div key={idx} className="flex items-start">
                                                                    <AlertTriangle className="w-4 h-4 text-[#FF9F0A] mt-0.5 mr-2 flex-shrink-0" />
                                                                    <span className="text-sm text-[#515154] leading-snug">{flag}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-[#86868B]">No high-relevance lifestyle flags.</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Clinical Flags section */}
                                {analysisResult.agent_2_report?.clinical_flags?.length > 0 && (
                                    <div className="mt-4">
                                        <h3 className="font-semibold text-[#1D1D1F] mb-3">Clinical Flags</h3>
                                        <div className="space-y-2">
                                            {analysisResult.agent_2_report.clinical_flags.map((flag, idx) => (
                                                <div key={idx} className="bg-red-50 border border-red-100 border-l-4 border-l-[#FF3B30] p-3 rounded-lg flex gap-3 shadow-sm items-start">
                                                    <AlertTriangle className="w-5 h-5 text-[#FF3B30] mt-0.5 flex-shrink-0" />
                                                    <span className="text-sm text-red-900 font-medium">{flag}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DoctorLayout >
    );
};

export default DoctorLifestylePage;
