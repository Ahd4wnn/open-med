import React, { useState, useEffect, useRef } from 'react';
import DoctorLayout from '../../components/doctor/DoctorLayout';
import Button from '../../components/shared/Button';
import Input from '../../components/shared/Input';
import Card from '../../components/shared/Card';
import FreeTypeInput from '../../components/shared/FreeTypeInput';
import PatientSelector from '../../components/shared/PatientSelector';
import { Activity, X, ChevronDown } from "lucide-react";

const CardHeader = ({ children, className = "" }) => <div className={`mb-2 ${className}`}>{children}</div>;
const CardTitle = ({ children, className = "" }) => <h3 className={`font-semibold text-[#1D1D1F] ${className}`}>{children}</h3>;
const CardContent = ({ children, className = "" }) => <div className={`${className}`}>{children}</div>;

const LineChart = ({ simulations }) => {
    // Determine max concentration to scale Y axis
    const maxConc = Math.max(...simulations.flatMap(s => s.concentration_curve.map(p => p.concentration_mg_l)), 0) || 1;
    // adding padding to top
    const yMax = maxConc * 1.1;
    const xMax = 72;

    const colors = ['#1D1D1F', '#6E6E73', '#AEAEB2', '#D1D1D6', '#0EA5E9', '#34C759'];

    // Y axis labels (auto 5 evenly spaced)
    const yLabels = Array.from({ length: 5 }, (_, i) => (yMax * (i / 4)).toFixed(yMax < 1 ? 3 : 1));
    const xLabels = [0, 12, 24, 36, 48, 72];

    return (
        <div className="w-full mt-4">
            <h3 className="font-semibold text-[#1D1D1F] mb-4">Plasma Concentration Over Time</h3>
            <div className="relative w-full h-[280px]">
                <svg viewBox="-8 0 112 115" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                    {/* Grid Lines */}
                    {[0, 25, 50, 75, 100].map(y => (
                        <line key={`grid-${y}`} x1="0" y1={y} x2="100" y2={y} stroke="#F5F5F7" strokeWidth="0.5" />
                    ))}

                    {/* Y-axis labels */}
                    {yLabels.reverse().map((lbl, idx) => (
                        <text key={`ylbl-${idx}`} x="-2" y={(idx * 25) + 1} fontSize="4" fill="#86868B" textAnchor="end">{lbl}</text>
                    ))}

                    {/* X-axis labels */}
                    {xLabels.map(lbl => (
                        <text key={`xlbl-${lbl}`} x={(lbl / xMax) * 100} y="108" fontSize="4" fill="#86868B" textAnchor="middle">{lbl}h</text>
                    ))}

                    {/* Therapeutic Ranges (Dashed) */}
                    {simulations.map((sim, idx) => {
                        const tLow = (1 - (sim.pk_parameters.therapeutic_range.low / yMax)) * 100;
                        const tHigh = (1 - (sim.pk_parameters.therapeutic_range.high / yMax)) * 100;
                        return (
                            <React.Fragment key={`tr-${sim.drug_name}`}>
                                {sim.pk_parameters.therapeutic_range.low <= yMax && (
                                    <line x1="0" y1={Math.max(0, tLow)} x2="100" y2={Math.max(0, tLow)} stroke="#34C759" strokeWidth="0.3" strokeDasharray="1,1" opacity="0.6" />
                                )}
                                {sim.pk_parameters.therapeutic_range.high <= yMax && (
                                    <line x1="0" y1={Math.max(0, tHigh)} x2="100" y2={Math.max(0, tHigh)} stroke="#FF3B30" strokeWidth="0.3" strokeDasharray="1,1" opacity="0.6" />
                                )}
                            </React.Fragment>
                        );
                    })}

                    {/* Concentration Curves */}
                    {simulations.map((sim, sIdx) => {
                        const color = colors[sIdx % colors.length];
                        const points = sim.concentration_curve.map(pt => {
                            const vx = (pt.time_hours / xMax) * 100;
                            const vy = (1 - (pt.concentration_mg_l / yMax)) * 100;
                            return `${vx},${vy}`;
                        }).join(' ');

                        return (
                            <polyline key={`curve-${sim.drug_name}`} points={points} fill="none" stroke={color} strokeWidth="1" strokeLinejoin="round" />
                        );
                    })}
                </svg>
            </div>

            <div className="flex flex-wrap gap-4 mt-8 justify-center">
                {simulations.map((sim, sIdx) => {
                    const statusColors = {
                        "Therapeutic": "bg-green-100 text-green-800",
                        "Sub-therapeutic": "bg-yellow-100 text-yellow-800",
                        "Toxic": "bg-red-100 text-red-800"
                    };
                    return (
                        <div key={`legend-${sim.drug_name}`} className="flex items-center gap-2">
                            <div className="w-4 h-1 rounded flex-shrink-0" style={{ backgroundColor: colors[sIdx % colors.length] }}></div>
                            <span className="text-sm font-medium text-[#1D1D1F] capitalize">{sim.drug_name}</span>
                            <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded-sm font-bold ${statusColors[sim.status.status_label]}`}>
                                {sim.status.status_label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const PKSimulationPage = () => {
    const [drugs, setDrugs] = useState([]);
    const [doses, setDoses] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [suggestions, setSuggestions] = useState([]);

    const [supportedDrugs, setSupportedDrugs] = useState([]);
    const [showSupported, setShowSupported] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);

    const [isSimulating, setIsSimulating] = useState(false);
    const [simResult, setSimResult] = useState(null);
    const [error, setError] = useState('');

    const [expandedAdjustments, setExpandedAdjustments] = useState({});

    // Debounce search - no longer needed with FreeTypeInput but kept for later if auto-complete is added.

    // Fetch supported drugs on mount
    useEffect(() => {
        const fetchSupported = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch('http://localhost:8000/api/pk/supported-drugs', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setSupportedDrugs(data.drugs || []);
                }
            } catch (err) {
                console.error("Failed to fetch supported drugs", err);
            }
        };
        fetchSupported();
    }, []);

    // Replaced search functionality since FreeTypeInput handles typing

    const addDrug = (drug) => {
        const dLower = drug.toLowerCase();
        if (!drugs.includes(dLower) && drugs.length < 15) {
            setDrugs([...drugs, dLower]);
            setDoses(prev => ({ ...prev, [dLower]: 100 }));
        }
    };

    const addPreset = (drugList, doseMap) => {
        setDrugs(drugList);
        setDoses(doseMap);
    };

    const removeDrug = (drugToRemove) => {
        setDrugs(drugs.filter(d => d !== drugToRemove));
        const newDoses = { ...doses };
        delete newDoses[drugToRemove];
        setDoses(newDoses);
    };

    const updateDose = (drug, amount) => {
        setDoses(prev => ({ ...prev, [drug]: amount }));
    };

    const runSimulation = async () => {
        if (drugs.length === 0) return;
        setIsSimulating(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:8000/api/pk/simulate', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    drug_names: drugs,
                    doses: doses,
                    patient_profile_id: selectedPatient ? selectedPatient.profile_id : null
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Simulation failed');
            setSimResult(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSimulating(false);
        }
    };

    const toggleAdjustment = (drug) => {
        setExpandedAdjustments(prev => ({ ...prev, [drug]: !prev[drug] }));
    };

    return (
        <DoctorLayout>
            <div className="flex flex-col md:flex-row gap-6 h-full pb-10">
                {/* Left Panel */}
                <div className="w-full md:w-[45%] flex flex-col gap-6">
                    <div>
                        <h2 className="text-2xl font-bold text-[#1D1D1F] tracking-tight mb-2">Configure Regimen</h2>
                        <p className="text-sm text-[#86868B]">Enter drugs and dosages to model their pharmacokinetics and enzyme interactions.</p>
                    </div>

                    {/* Drug Input */}
                    <Card>
                        <CardContent className="p-6">
                            <FreeTypeInput
                                selectedItems={drugs}
                                onAdd={addDrug}
                                onRemove={removeDrug}
                                placeholder="e.g. warfarin, digoxin, amiodarone..."
                                label="ADD MEDICATIONS"
                                sublabel="Type a medication name and press Enter to add. Then set the dose for each drug."
                                hideChips={true}
                                confirmationText=""
                            />

                            {drugs.length > 0 && (
                                <div className="mt-3 space-y-0">
                                    {drugs.map(drug => (
                                        <div key={drug} className="flex items-center justify-between py-2 border-b border-[#EBEBED] last:border-0">
                                            <div className="flex items-center">
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#0EA5E9] mr-2"></span>
                                                <span className="text-sm font-medium text-[#1D1D1F] capitalize">{drug}</span>
                                            </div>
                                            <div className="flex items-center">
                                                <input
                                                    type="number"
                                                    className="w-[90px] px-2 py-1 bg-white border border-[#EBEBED] rounded-lg text-sm outline-none focus:ring-1 focus:ring-[#0EA5E9] text-right"
                                                    placeholder="mg"
                                                    value={doses[drug] || ""}
                                                    onChange={(e) => updateDose(drug, parseFloat(e.target.value) || 0)}
                                                />
                                                <span className="text-xs text-[#86868B] ml-1">mg</span>
                                                <button onClick={() => removeDrug(drug)} className="text-[#86868B] hover:text-[#FF3B30] transition-colors ml-2 focus:outline-none">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    <p className="text-xs text-[#86868B] mt-2">
                                        Default dose is 100mg if not specified
                                    </p>
                                </div>
                            )}

                            {/* Presets */}
                            <div className="mt-4">
                                <h3 className="text-[10px] uppercase tracking-wider text-[#86868B] font-semibold mb-2">
                                    COMMON REGIMENS
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    <button onClick={() => addPreset(['warfarin', 'amiodarone'], { warfarin: 5, amiodarone: 200 })} className="bg-[#F5F5F7] border border-[#EBEBED] rounded-lg px-3 py-1.5 text-xs font-medium text-[#1D1D1F] hover:bg-[#EBEBED] transition-colors flex items-center">
                                        <span className="mr-1 text-[#86868B]">+</span> Warfarin + Amiodarone
                                    </button>
                                    <button onClick={() => addPreset(['digoxin', 'amiodarone', 'metoprolol'], { digoxin: 0.25, amiodarone: 200, metoprolol: 50 })} className="bg-[#F5F5F7] border border-[#EBEBED] rounded-lg px-3 py-1.5 text-xs font-medium text-[#1D1D1F] hover:bg-[#EBEBED] transition-colors flex items-center">
                                        <span className="mr-1 text-[#86868B]">+</span> Digoxin + Amiodarone + Metoprolol
                                    </button>
                                    <button onClick={() => addPreset(['simvastatin', 'fluconazole'], { simvastatin: 40, fluconazole: 150 })} className="bg-[#F5F5F7] border border-[#EBEBED] rounded-lg px-3 py-1.5 text-xs font-medium text-[#1D1D1F] hover:bg-[#EBEBED] transition-colors flex items-center">
                                        <span className="mr-1 text-[#86868B]">+</span> Simvastatin + Fluconazole
                                    </button>
                                    <button onClick={() => addPreset(['warfarin', 'fluconazole', 'aspirin'], { warfarin: 5, fluconazole: 150, aspirin: 100 })} className="bg-[#F5F5F7] border border-[#EBEBED] rounded-lg px-3 py-1.5 text-xs font-medium text-[#1D1D1F] hover:bg-[#EBEBED] transition-colors flex items-center">
                                        <span className="mr-1 text-[#86868B]">+</span> Warfarin + Fluconazole + Aspirin
                                    </button>
                                    <button onClick={() => addPreset(['metformin', 'lisinopril', 'metoprolol'], { metformin: 500, lisinopril: 10, metoprolol: 50 })} className="bg-[#F5F5F7] border border-[#EBEBED] rounded-lg px-3 py-1.5 text-xs font-medium text-[#1D1D1F] hover:bg-[#EBEBED] transition-colors flex items-center">
                                        <span className="mr-1 text-[#86868B]">+</span> Metformin + Lisinopril + Metoprolol
                                    </button>
                                </div>
                            </div>

                            {drugs.length >= 1 && (
                                <p className="text-xs font-medium text-[#34C759] mt-3">
                                    ✓ {drugs.length} medication(s) configured for simulation
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <h3 className="text-[11px] uppercase tracking-wider text-[#86868B] font-semibold mb-3">
                                SELECT PATIENT (Optional)
                            </h3>
                            <PatientSelector
                                selectedPatient={selectedPatient}
                                onSelectPatient={setSelectedPatient}
                            />
                            <p className="text-xs text-[#86868B] mt-2">Adjusts simulation for patient's kidney/liver function</p>
                        </CardContent>
                    </Card>

                    <Button onClick={runSimulation} disabled={drugs.length < 1 || isSimulating} className="w-full h-12 text-base">
                        {isSimulating ? "Simulating drug concentrations..." : "Run PK Simulation"}
                    </Button>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
                            {error}
                        </div>
                    )}

                    {/* Supported Drugs List */}
                    {supportedDrugs.length > 0 && (
                        <div className="mt-2">
                            <button
                                onClick={() => setShowSupported(!showSupported)}
                                className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-[#86868B] hover:text-[#1D1D1F] transition-colors focus:outline-none"
                            >
                                SUPPORTED DRUGS ({supportedDrugs.length}) <ChevronDown size={16} />
                            </button>
                            {showSupported && (
                                <div className="mt-3 flex flex-wrap gap-1">
                                    {supportedDrugs.map(d => (
                                        <span key={d} className="text-xs bg-white border border-[#EBEBED] text-[#515154] rounded-full px-2 py-0.5 capitalize shadow-sm">
                                            {d}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Panel */}
                <div className="w-full md:w-[55%] flex flex-col gap-6">
                    {!simResult && !isSimulating && (
                        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[#EBEBED] rounded-2xl bg-white p-12 text-center h-full min-h-[400px]">
                            <div className="w-16 h-16 bg-[#F5F5F7] rounded-full flex items-center justify-center mb-6 text-[#86868B]">
                                <Activity size={18} />
                            </div>
                            <h3 className="text-lg font-bold text-[#1D1D1F] mb-2">No Simulation Active</h3>
                            <p className="text-sm text-[#86868B] max-w-sm">
                                Configure medications and run simulation to see drug concentration curves and PK interactions.
                            </p>
                        </div>
                    )}

                    {isSimulating && (
                        <div className="flex-1 flex flex-col items-center justify-center border border-[#EBEBED] rounded-2xl bg-white p-12 h-full min-h-[400px]">
                            <div className="w-8 h-8 border-4 border-[#F5F5F7] border-t-[#0EA5E9] rounded-full animate-spin"></div>
                            <p className="mt-4 text-sm font-medium text-[#86868B]">Calculating Multi-Compartment Modeling...</p>
                        </div>
                    )}

                    {simResult && !isSimulating && (
                        <div className="space-y-6">
                            {/* Section 1: Overall PK Risk Banner */}
                            {simResult.overall_pk_risk === "High" && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                                    <h3 className="text-[18px] font-bold text-red-800 mb-1">High PK Risk</h3>
                                    <p className="text-sm text-red-700">{simResult.pk_risk_explanation}</p>
                                </div>
                            )}
                            {simResult.overall_pk_risk === "Moderate" && (
                                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                                    <h3 className="text-[18px] font-bold text-yellow-800 mb-1">Moderate PK Risk</h3>
                                    <p className="text-sm text-yellow-700">{simResult.pk_risk_explanation}</p>
                                </div>
                            )}
                            {simResult.overall_pk_risk === "Low" && (
                                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                                    <h3 className="text-[18px] font-bold text-green-800 mb-1">Low PK Risk</h3>
                                    <p className="text-sm text-green-700">{simResult.pk_risk_explanation}</p>
                                </div>
                            )}

                            {/* Warnings for missing drugs */}
                            {simResult.drugs_without_pk_data.length > 0 && (
                                <div className="p-3 bg-[#F5F5F7] border border-[#EBEBED] rounded-lg">
                                    <p className="text-sm font-medium text-[#86868B]">
                                        <span className="text-[#1D1D1F]">Note:</span> The following drugs are unsupported in the PK database and were excluded: {simResult.drugs_without_pk_data.join(", ")}
                                    </p>
                                </div>
                            )}

                            {/* Section 2: Concentration Curves */}
                            {simResult.simulations.length > 0 && (
                                <Card>
                                    <CardContent className="pt-6">
                                        <LineChart simulations={simResult.simulations} />
                                    </CardContent>
                                </Card>
                            )}

                            {/* Section 3: Per Drug Cards */}
                            {simResult.simulations.map(sim => {
                                const statusColors = {
                                    "Therapeutic": "bg-green-100 text-green-800 border-green-200",
                                    "Sub-therapeutic": "bg-yellow-100 text-yellow-800 border-yellow-200",
                                    "Toxic": "bg-red-100 text-red-800 border-red-200"
                                };
                                const isExpanded = expandedAdjustments[sim.drug_name];
                                const hasAdjustments = sim.patient_adjustments.combined_modifier !== 1.0;

                                return (
                                    <Card key={`card-${sim.drug_name}`} className="mb-4">
                                        <CardHeader className="pb-2 border-b border-[#EBEBED]">
                                            <div className="flex items-center justify-between w-full">
                                                <CardTitle className="capitalize text-lg">{sim.drug_name}</CardTitle>
                                                <span className={`text-[11px] uppercase font-bold px-2 py-1 rounded border ${statusColors[sim.status.status_label]}`}>
                                                    {sim.status.status_label}
                                                </span>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pt-4 space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-3">
                                                    <div>
                                                        <p className="text-[10px] uppercase text-[#86868B] font-semibold tracking-wider">Peak Concentration</p>
                                                        <p className="font-semibold text-[#1D1D1F] text-sm">{sim.pk_parameters.adjusted_cmax_mg_l} <span className="text-xs font-normal text-[#86868B]">mg/L</span></p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] uppercase text-[#86868B] font-semibold tracking-wider">Effective Half-Life</p>
                                                        <p className="font-semibold text-[#1D1D1F] text-sm">{sim.pk_parameters.effective_half_life_hours} <span className="text-xs font-normal text-[#86868B]">hours</span></p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] uppercase text-[#86868B] font-semibold tracking-wider">Therapeutic Range</p>
                                                        <p className="font-semibold text-[#1D1D1F] text-sm">{sim.pk_parameters.therapeutic_range.low} – {sim.pk_parameters.therapeutic_range.high} <span className="text-xs font-normal text-[#86868B]">mg/L</span></p>
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    <div>
                                                        <p className="text-[10px] uppercase text-[#86868B] font-semibold tracking-wider">Clearance Pathway</p>
                                                        <p className="font-semibold text-[#1D1D1F] text-sm capitalize">{sim.pk_parameters.clearance_pathway}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] uppercase text-[#86868B] font-semibold tracking-wider">Bioavailability</p>
                                                        <p className="font-semibold text-[#1D1D1F] text-sm">{sim.pk_parameters.bioavailability_percent}%</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] uppercase text-[#86868B] font-semibold tracking-wider">Protein Binding</p>
                                                        <p className="font-semibold text-[#1D1D1F] text-sm">{sim.pk_parameters.protein_binding_percent}%</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-2 border-t border-[#EBEBED]">
                                                <button
                                                    className={`flex items-center justify-between w-full py-1 text-sm font-semibold transition-colors ${hasAdjustments ? 'text-[#FF9500] hover:text-[#FF9500]/80' : 'text-[#86868B] hover:text-[#1D1D1F]'}`}
                                                    onClick={() => toggleAdjustment(sim.drug_name)}
                                                >
                                                    <span>Patient Adjustments (×{sim.patient_adjustments.combined_modifier})</span>
                                                    <ChevronDown size={16} />
                                                </button>

                                                {isExpanded && (
                                                    <div className="mt-3 space-y-3">
                                                        <div className="p-3 bg-[#F5F5F7] rounded-lg">
                                                            <div className="text-2xl font-bold mb-2">
                                                                <span className={sim.patient_adjustments.combined_modifier >= 1.5 ? 'text-red-500' : sim.patient_adjustments.combined_modifier <= 0.6 ? 'text-blue-500' : 'text-[#1D1D1F]'}>
                                                                    ×{sim.patient_adjustments.combined_modifier}
                                                                </span>
                                                                <span className="text-xs text-[#86868B] font-normal ml-2">Net Metabolism Multiplier</span>
                                                            </div>
                                                            <ul className="list-disc pl-4 space-y-1 text-sm text-[#86868B]">
                                                                {sim.patient_adjustments.clearance_explanations.map((exp, i) => (
                                                                    <li key={i}>{exp}</li>
                                                                ))}
                                                                {sim.patient_adjustments.clearance_explanations.length === 0 && (
                                                                    <li>No renal or hepatic organ clearance adjustments.</li>
                                                                )}
                                                            </ul>
                                                        </div>

                                                        {sim.patient_adjustments.cyp_effects.map((fx, i) => (
                                                            <div key={i} className={`p-2 pl-3 border-l-4 rounded bg-white border border-[#EBEBED] ${fx.clinical_significance === 'HIGH' ? 'border-l-red-500' : 'border-l-yellow-500'}`}>
                                                                <p className="text-sm font-medium text-[#1D1D1F]">{fx.effect}</p>
                                                            </div>
                                                        ))}

                                                        <div className="p-3 border border-blue-100 bg-blue-50 rounded-lg">
                                                            <p className="text-sm text-blue-900 italic">" {sim.clinical_interpretation} "</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                        </CardContent>
                                    </Card>
                                );
                            })}

                            {/* Section 4: CYP Interaction Matrix */}
                            {simResult.interaction_matrix.length > 0 && (
                                <Card>
                                    <CardHeader className="pb-3 border-b border-[#EBEBED]">
                                        <CardTitle className="text-md">CYP Enzyme Interaction Matrix</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead>
                                                    <tr>
                                                        <th className="px-3 py-2 text-[#86868B] font-medium border-b border-[#EBEBED]">Affected Drug →</th>
                                                        {simResult.simulations.map(s => (
                                                            <th key={`th-${s.drug_name}`} className="px-3 py-2 font-semibold text-[#1D1D1F] border-b border-[#EBEBED] capitalize">{s.drug_name}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {simResult.simulations.map(simA => (
                                                        <tr key={`tr-${simA.drug_name}`} className="border-b border-[#EBEBED] last:border-0 hover:bg-[#F5F5F7] transition-colors">
                                                            <td className="px-3 py-3 font-semibold text-[#1D1D1F] capitalize whitespace-nowrap">{simA.drug_name} <span className="font-normal text-xs text-[#86868B] ml-1">(acting as modifier)</span></td>
                                                            {simResult.simulations.map(simB => {
                                                                if (simA.drug_name === simB.drug_name) {
                                                                    return <td key={`td-${simA.drug_name}-${simB.drug_name}`} className="px-3 py-3 text-[#86868B] text-center">—</td>;
                                                                }
                                                                const interaction = simResult.interaction_matrix.find(ix => ix.drug_a === simB.drug_name && ix.drug_b === simA.drug_name);

                                                                if (!interaction) return <td key={`td-${simA.drug_name}-${simB.drug_name}`} className="px-3 py-3 text-center text-[#86868B] bg-white">1.0</td>;

                                                                const mult = interaction.net_multiplier;
                                                                let bg = "bg-white text-[#1D1D1F]";
                                                                if (mult >= 3.0) bg = "bg-red-500 text-white font-bold";
                                                                else if (mult >= 1.5) bg = "bg-yellow-400 text-yellow-900 font-bold";
                                                                else if (mult < 1.0) bg = "bg-blue-100 text-blue-800 font-bold";

                                                                return (
                                                                    <td key={`td-${simA.drug_name}-${simB.drug_name}`} className={`px-3 py-3 text-center rounded border border-white ${bg}`}>
                                                                        {mult.toFixed(1)}×
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <p className="text-xs text-[#86868B] mt-4">Values show concentration multiplier effect on the affected drug column. &gt;1.0 = increased exposure (inhibition), &lt;1.0 = reduced exposure (induction).</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </DoctorLayout >
    );
};

export default PKSimulationPage;
