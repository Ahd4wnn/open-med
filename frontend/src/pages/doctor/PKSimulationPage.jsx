import React, { useState, useEffect, useRef } from 'react';
import DoctorLayout from '../../components/doctor/DoctorLayout';
import Button from '../../components/shared/Button';
import Input from '../../components/shared/Input';
import Card from '../../components/shared/Card';

const CardHeader = ({ children, className = "" }) => <div className={`mb-2 ${className}`}>{children}</div>;
const CardTitle = ({ children, className = "" }) => <h3 className={`font-semibold text-[#1D1D1F] ${className}`}>{children}</h3>;
const CardContent = ({ children, className = "" }) => <div className={`${className}`}>{children}</div>;

const ActivityIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
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

const ChevronDownIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
);

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
    const [patientId, setPatientId] = useState('');

    const [isSimulating, setIsSimulating] = useState(false);
    const [simResult, setSimResult] = useState(null);
    const [error, setError] = useState('');

    const [expandedAdjustments, setExpandedAdjustments] = useState({});

    // Debounce search
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

    const fetchSuggestions = async (query) => {
        setIsSearching(true);
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
        } finally {
            setIsSearching(false);
        }
    };

    const addDrug = (drug) => {
        if (!drugs.includes(drug) && drugs.length < 15) {
            setDrugs([...drugs, drug]);
            setDoses(prev => ({ ...prev, [drug]: 100 }));
        }
        setSearchTerm('');
        setSuggestions([]);
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
                    patient_profile_id: patientId ? parseInt(patientId) : null
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
                        <CardHeader className="pb-4">
                            <CardTitle className="text-[14px]">Medications To Simulate</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[#86868B]">
                                    <SearchIcon />
                                </div>
                                <input
                                    type="text"
                                    className="w-full pl-10 pr-4 py-2 bg-[#F5F5F7] border-0 rounded-lg text-sm focus:ring-2 focus:ring-[#0EA5E9] transition-all outline-none"
                                    placeholder="Search drug name (e.g. Warfarin, Aspirin)"
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

                            <div className="space-y-3">
                                {drugs.map(drug => (
                                    <div key={drug} className="flex flex-col gap-2 p-3 bg-[#F5F5F7] rounded-lg border border-[#EBEBED]">
                                        <div className="flex items-center justify-between">
                                            <span className="font-semibold text-[#1D1D1F] capitalize">{drug}</span>
                                            <button onClick={() => removeDrug(drug)} className="text-[#86868B] hover:text-[#FF3B30] transition-colors p-1">
                                                <XIcon />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <label className="text-xs text-[#86868B] font-medium">Dose:</label>
                                            <input
                                                type="number"
                                                className="w-24 px-2 py-1 bg-white border border-[#EBEBED] rounded text-sm outline-none focus:ring-1 focus:ring-[#0EA5E9]"
                                                placeholder="mg"
                                                value={doses[drug]}
                                                onChange={(e) => updateDose(drug, parseFloat(e.target.value) || 0)}
                                            />
                                            <span className="text-xs text-[#86868B]">mg</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-[14px]">Patient Context (Optional)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Input
                                label="Patient Profile ID"
                                placeholder="Enter ID to apply renal/hepatic modifiers"
                                value={patientId}
                                onChange={(e) => setPatientId(e.target.value)}
                            />
                        </CardContent>
                    </Card>

                    <Button onClick={runSimulation} disabled={drugs.length === 0 || isSimulating} className="w-full h-11">
                        {isSimulating ? "Simulating..." : "Run Simulation"}
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
                                className="flex items-center gap-2 text-sm font-medium text-[#86868B] hover:text-[#1D1D1F] transition-colors"
                            >
                                <ChevronDownIcon /> Supported Drugs ({supportedDrugs.length})
                            </button>
                            {showSupported && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {supportedDrugs.map(d => (
                                        <span key={d} className="text-xs bg-[#F5F5F7] border border-[#EBEBED] text-[#1D1D1F] rounded-full px-2 py-1 capitalize">
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
                                <ActivityIcon />
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
                                                    <ChevronDownIcon />
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
        </DoctorLayout>
    );
};

export default PKSimulationPage;
