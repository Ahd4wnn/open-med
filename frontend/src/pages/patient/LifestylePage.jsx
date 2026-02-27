import React, { useState, useEffect } from 'react';
import PatientLayout from '../../components/patient/PatientLayout';
import Button from '../../components/shared/Button';
import Input from '../../components/shared/Input';
import Card from '../../components/shared/Card';
import FreeTypeInput from '../../components/shared/FreeTypeInput';
import { Search, X, ChevronDown, Utensils, Plus, Check } from "lucide-react";

const CardHeader = ({ children, className = "" }) => <div className={`mb-2 ${className}`}>{children}</div>;
const CardTitle = ({ children, className = "" }) => <h3 className={`font-semibold text-[#1D1D1F] ${className}`}>{children}</h3>;
const CardContent = ({ children, className = "" }) => <div className={`${className}`}>{children}</div>;

const SearchIcon = () => <Search size={16} />;
const XIcon = () => <X size={14} />;
const ChevronDownIcon = ({ expanded }) => <ChevronDown size={16} style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />;
const ForkKnifeIcon = () => <Utensils size={18} />;
const MedicalCrossIcon = () => <Plus size={18} />;
const CheckIcon = () => <Check size={16} color="#34C759" strokeWidth={3} />;

const OptionPill = ({ label, selected, onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selected ? 'bg-[#0EA5E9] text-white border-[#0EA5E9]' : 'bg-[#F5F5F7] text-[#1D1D1F] hover:bg-[#EBEBED] border-transparent'} border`}
    >
        {label}
    </button>
);

const LifestylePage = () => {
    const [activeTab, setActiveTab] = useState("log"); // "log" or "analyze"

    // Log State
    const [sleepHours, setSleepHours] = useState('');
    const [sleepQuality, setSleepQuality] = useState('');
    const [activityLevel, setActivityLevel] = useState('');
    const [dietType, setDietType] = useState('');
    const [alcoholUnits, setAlcoholUnits] = useState('');
    const [smokingStatus, setSmokingStatus] = useState('');
    const [stressLevel, setStressLevel] = useState(5);
    const [waterIntake, setWaterIntake] = useState('');

    // Food Log
    const [foodLog, setFoodLog] = useState([]);
    const [foodInput, setFoodInput] = useState('');

    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState(null);

    // Analysis State
    const [drugs, setDrugs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [analysisError, setAnalysisError] = useState('');

    // AI Report Collapse State
    const [expandedSections, setExpandedSections] = useState({
        food_changes: false,
        lifestyle_modifications: false,
        sleep_and_metabolism: false
    });

    // Agent animation phases
    const [agent1Done, setAgent1Done] = useState(false);
    const [agent2Done, setAgent2Done] = useState(false);

    useEffect(() => {
        const fetchLatestLog = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch('http://localhost:8000/api/lifestyle/log', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data) {
                        if (data.sleep_hours) setSleepHours(data.sleep_hours);
                        if (data.sleep_quality) setSleepQuality(data.sleep_quality);
                        if (data.activity_level) setActivityLevel(data.activity_level);
                        if (data.diet_type) setDietType(data.diet_type);
                        if (data.alcohol_units_per_week !== null) setAlcoholUnits(data.alcohol_units_per_week);
                        if (data.smoking_status) setSmokingStatus(data.smoking_status);
                        if (data.stress_level) setStressLevel(data.stress_level);
                        if (data.water_intake_liters !== null) setWaterIntake(data.water_intake_liters);
                        if (data.food_log) setFoodLog(data.food_log);
                    }
                }
            } catch (err) {
                console.error("Failed to load lifestyle log", err);
            }
        };
        fetchLatestLog();
    }, []);

    // Debounce search - no longer needed with FreeTypeInput but kept for compatibility

    // Search logic replaced by FreeTypeInput

    const addDrug = (drug) => {
        const dLower = drug.toLowerCase();
        if (!drugs.includes(dLower) && drugs.length < 20) {
            setDrugs([...drugs, dLower]);
        }
    };

    const addPreset = (drugList) => {
        const newList = [...new Set([...drugs, ...drugList])];
        setDrugs(newList);
    };

    const removeDrug = (drugToRemove) => {
        setDrugs(drugs.filter(d => d !== drugToRemove));
    };

    const handleFoodKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addFoodItem(foodInput);
        }
    };

    const addFoodItem = (item) => {
        const val = item.trim();
        if (val && !foodLog.includes(val) && foodLog.length < 50) {
            setFoodLog([...foodLog, val]);
        }
        setFoodInput('');
    };

    const removeFoodItem = (idx) => {
        setFoodLog(foodLog.filter((_, i) => i !== idx));
    };

    const saveLog = async () => {
        setIsSaving(true);
        setSaveMessage(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:8000/api/lifestyle/log', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sleep_hours: sleepHours ? parseFloat(sleepHours) : null,
                    sleep_quality: sleepQuality || null,
                    activity_level: activityLevel || null,
                    diet_type: dietType || null,
                    alcohol_units_per_week: alcoholUnits !== '' ? parseFloat(alcoholUnits) : null,
                    smoking_status: smokingStatus || null,
                    stress_level: parseInt(stressLevel) || null,
                    water_intake_liters: waterIntake !== '' ? parseFloat(waterIntake) : null,
                    food_log: foodLog.length > 0 ? foodLog : null
                })
            });
            if (!res.ok) throw new Error("Failed to save log");
            setSaveMessage({ type: 'success', text: "Lifestyle log saved successfully!" });
            setTimeout(() => setSaveMessage(null), 3000);
        } catch (err) {
            setSaveMessage({ type: 'error', text: err.message });
        } finally {
            setIsSaving(false);
        }
    };

    const runAnalysis = async () => {
        if (drugs.length === 0) return;
        setIsAnalyzing(true);
        setAnalysisError('');
        setAnalysisResult(null);
        setAgent1Done(false);
        setAgent2Done(false);

        // Fake timing for visual pipeline effect
        setTimeout(() => setAgent1Done(true), 2500);
        setTimeout(() => setAgent2Done(true), 4000);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:8000/api/lifestyle/analyze', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    drug_names: drugs
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Analysis failed');
            setAnalysisResult(data);
            setAgent1Done(true);
            setAgent2Done(true);
        } catch (err) {
            setAnalysisError(err.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getStressColor = (level) => {
        if (level <= 3) return 'text-green-500';
        if (level <= 6) return 'text-yellow-500';
        return 'text-red-500';
    };

    return (
        <PatientLayout>
            <div className="max-w-4xl mx-auto h-full flex flex-col pb-10">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-[#1D1D1F] tracking-tight">Lifestyle & Food Analysis</h1>
                    <p className="mt-2 text-[#86868B] text-lg">
                        Log your daily habits to see how they interact with your medications.
                    </p>
                </div>

                <div className="flex border-b border-[#EBEBED] mb-6">
                    <button
                        onClick={() => setActiveTab("log")}
                        className={`px-8 py-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'log' ? 'border-[#0EA5E9] text-[#0EA5E9]' : 'border-transparent text-[#86868B] hover:text-[#1D1D1F]'}`}
                    >
                        Log Your Lifestyle
                    </button>
                    <button
                        onClick={() => setActiveTab("analyze")}
                        className={`px-8 py-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'analyze' ? 'border-[#0EA5E9] text-[#0EA5E9]' : 'border-transparent text-[#86868B] hover:text-[#1D1D1F]'}`}
                    >
                        My Analysis
                    </button>
                </div>

                {activeTab === "log" && (
                    <div className="max-w-2xl mx-auto w-full">
                        <Card>
                            <CardContent className="p-6">
                                {/* Section 1: Sleep */}
                                <h3 className="font-semibold text-lg text-[#1D1D1F] mb-4">Sleep</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        label="Sleep Hours"
                                        type="number"
                                        min="0" max="24" step="0.5"
                                        placeholder="Hours per night"
                                        value={sleepHours}
                                        onChange={(e) => setSleepHours(e.target.value)}
                                    />
                                    <div>
                                        <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">Sleep Quality</label>
                                        <div className="flex flex-wrap gap-2">
                                            {["Poor", "Fair", "Good", "Excellent"].map(q => (
                                                <OptionPill key={q} label={q} selected={sleepQuality === q.toLowerCase()} onClick={() => setSleepQuality(q.toLowerCase())} />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Activity */}
                                <h3 className="font-semibold text-lg text-[#1D1D1F] mt-8 mb-4">Activity & Diet</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">Activity Level</label>
                                        <div className="flex flex-wrap gap-2">
                                            {["Sedentary", "Light", "Moderate", "Active", "Very Active"].map(a => {
                                                const val = a.toLowerCase().replace(" ", "_");
                                                return <OptionPill key={val} label={a} selected={activityLevel === val} onClick={() => setActivityLevel(val)} />
                                            })}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">Diet Type</label>
                                        <div className="flex flex-wrap gap-2">
                                            {["Omnivore", "Vegetarian", "Vegan", "Keto", "Mediterranean", "Other"].map(d => (
                                                <OptionPill key={d} label={d} selected={dietType === d.toLowerCase()} onClick={() => setDietType(d.toLowerCase())} />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Section 3: Habits */}
                                <h3 className="font-semibold text-lg text-[#1D1D1F] mt-8 mb-4">Habits & Stress</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <Input
                                            label="Alcohol (units/week)"
                                            type="number"
                                            min="0"
                                            placeholder="0"
                                            value={alcoholUnits}
                                            onChange={(e) => setAlcoholUnits(e.target.value)}
                                        />
                                        <p className="text-xs text-[#86868B] mt-1">1 unit = 1 small beer or 1 glass of wine</p>
                                    </div>
                                    <Input
                                        label="Water Intake (L/day)"
                                        type="number"
                                        min="0" step="0.1"
                                        placeholder="2.0"
                                        value={waterIntake}
                                        onChange={(e) => setWaterIntake(e.target.value)}
                                    />
                                    <div>
                                        <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">Smoking Status</label>
                                        <div className="flex flex-wrap gap-2">
                                            {["Never", "Former", "Current"].map(s => (
                                                <OptionPill key={s} label={s} selected={smokingStatus === s.toLowerCase()} onClick={() => setSmokingStatus(s.toLowerCase())} />
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#1D1D1F] mb-1.5">Stress Level (1-10)</label>
                                        <div className="flex items-center gap-4 mt-2">
                                            <span className={`text-4xl font-bold ${getStressColor(stressLevel)} w-12 text-center`}>{stressLevel}</span>
                                            <div className="flex-1 flex flex-col pt-2">
                                                <input
                                                    type="range"
                                                    min="1" max="10"
                                                    value={stressLevel}
                                                    onChange={(e) => setStressLevel(parseInt(e.target.value))}
                                                    className="w-full accent-[#0EA5E9]"
                                                />
                                                <div className="flex justify-between text-[10px] text-[#86868B] mt-1 uppercase font-semibold tracking-wider">
                                                    <span>Low</span>
                                                    <span>High</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 4: Food Log */}
                                <h3 className="font-semibold text-lg text-[#1D1D1F] mt-8 mb-1">Today's Food Log</h3>
                                <p className="text-sm text-[#86868B] mb-4">What have you eaten today? Add each main food item (especially large quantities or supplements).</p>

                                <div className="space-y-4">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            className="w-full px-4 py-3 bg-[#F5F5F7] border-0 rounded-lg text-sm focus:ring-2 focus:ring-[#0EA5E9] transition-all outline-none"
                                            placeholder="Type a food and press Enter..."
                                            value={foodInput}
                                            onChange={(e) => setFoodInput(e.target.value)}
                                            onKeyDown={handleFoodKeyDown}
                                        />
                                    </div>

                                    {foodLog.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {foodLog.map((item, idx) => (
                                                <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#EBEBED] rounded-full text-sm font-medium text-[#1D1D1F] shadow-sm">
                                                    {item}
                                                    <button onClick={() => removeFoodItem(idx)} className="text-[#86868B] hover:text-[#FF3B30] focus:outline-none ml-1">
                                                        <XIcon />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div>
                                        <p className="text-[10px] uppercase text-[#86868B] font-semibold tracking-wider mb-2">QUICK ADD COMMON INTERACTORS</p>
                                        <div className="flex flex-wrap gap-2">
                                            {["Grapefruit", "Alcohol", "Spinach", "Dairy", "Banana", "Avocado", "Aged Cheese", "Red Wine"].map(f => (
                                                <button
                                                    key={f}
                                                    onClick={() => addFoodItem(f)}
                                                    className="text-xs px-2 py-1 bg-[#F5F5F7] hover:bg-[#EBEBED] text-[#1D1D1F] rounded-md border border-[#EBEBED] transition-colors"
                                                >
                                                    {f}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-[#EBEBED]">
                                    {saveMessage && (
                                        <div className={`p-3 mb-4 rounded-lg text-sm font-medium ${saveMessage.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                                            {saveMessage.text}
                                        </div>
                                    )}
                                    <Button onClick={saveLog} disabled={isSaving} className="w-full h-12 text-base">
                                        {isSaving ? "Saving..." : "Save Lifestyle Log"}
                                    </Button>
                                    <p className="text-center text-xs text-[#86868B] mt-3">This data will be used securely for your personalized analysis.</p>
                                </div>

                            </CardContent>
                        </Card>
                    </div>
                )}

                {activeTab === "analyze" && (
                    <div className="w-full flex flex-col gap-6 max-w-4xl mx-auto">

                        {/* Drug Selection */}
                        <Card>
                            <CardContent className="p-6">
                                <FreeTypeInput
                                    selectedItems={drugs}
                                    onAdd={addDrug}
                                    onRemove={removeDrug}
                                    placeholder="e.g. warfarin, digoxin..."
                                    label="YOUR MEDICATIONS"
                                    sublabel="Type your medications and press Enter to add"
                                    confirmationText="✓ {count} medication(s) ready for analysis"
                                />

                                <div className="mt-4">
                                    <h3 className="text-[10px] uppercase tracking-wider text-[#86868B] font-semibold mb-2">COMMON MEDICATIONS</h3>
                                    <div className="flex flex-wrap gap-2">
                                        <button onClick={() => addPreset(['metformin', 'lisinopril'])} className="bg-[#F5F5F7] border border-[#EBEBED] rounded-lg px-2.5 py-1 text-xs font-medium text-[#1D1D1F] hover:bg-[#EBEBED] transition-colors flex items-center">
                                            <span className="mr-1 text-[#86868B]">+</span> Metformin + Lisinopril
                                        </button>
                                        <button onClick={() => addPreset(['warfarin', 'aspirin'])} className="bg-[#F5F5F7] border border-[#EBEBED] rounded-lg px-2.5 py-1 text-xs font-medium text-[#1D1D1F] hover:bg-[#EBEBED] transition-colors flex items-center">
                                            <span className="mr-1 text-[#86868B]">+</span> Warfarin + Aspirin
                                        </button>
                                        <button onClick={() => addPreset(['simvastatin', 'amlodipine'])} className="bg-[#F5F5F7] border border-[#EBEBED] rounded-lg px-2.5 py-1 text-xs font-medium text-[#1D1D1F] hover:bg-[#EBEBED] transition-colors flex items-center">
                                            <span className="mr-1 text-[#86868B]">+</span> Simvastatin + Amlodipine
                                        </button>
                                        <button onClick={() => addPreset(['metoprolol', 'lisinopril', 'aspirin'])} className="bg-[#F5F5F7] border border-[#EBEBED] rounded-lg px-2.5 py-1 text-xs font-medium text-[#1D1D1F] hover:bg-[#EBEBED] transition-colors flex items-center">
                                            <span className="mr-1 text-[#86868B]">+</span> Metoprolol + Lisinopril + Aspirin
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4 mt-6">

                                    {analysisError && (
                                        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 mt-2">
                                            {analysisError}
                                        </div>
                                    )}

                                    <Button onClick={runAnalysis} disabled={drugs.length < 1 || isAnalyzing} className="w-full h-12 text-base">
                                        {isAnalyzing ? "Analyzing your lifestyle..." : "Check My Lifestyle & Medications"}
                                    </Button>

                                    <p className="text-xs text-[#86868B] mt-2 italic text-center">
                                        Analysis uses your saved lifestyle log. Make sure your log is up to date in the Log tab.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Loading / Results Area */}
                        {(isAnalyzing || analysisResult) && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                                {/* Agents Status Pipeline */}
                                <div className="flex items-center justify-center gap-4 py-4">
                                    <div className={`flex-1 max-w-[280px] p-4 rounded-xl border transition-all duration-500 ${agent1Done ? 'bg-white border-[#34C759]' : 'bg-[#F5F5F7] border-[#EBEBED]'}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2 text-[#0EA5E9]">
                                                <ForkKnifeIcon />
                                                <span className="font-semibold text-sm text-[#1D1D1F]">Food & Lifestyle Agent</span>
                                            </div>
                                            {agent1Done ? <CheckIcon /> : <div className="w-4 h-4 border-2 border-[#EBEBED] border-t-[#0EA5E9] rounded-full animate-spin"></div>}
                                        </div>
                                        {agent1Done && analysisResult && (
                                            <p className="text-xs text-[#86868B] font-medium">{analysisResult.agent_1_report.total_food_risks} food risks · {analysisResult.agent_1_report.total_lifestyle_flags} lifestyle flags</p>
                                        )}
                                        {!agent1Done && <p className="text-xs text-[#86868B] font-medium">Analyzing inputs...</p>}
                                    </div>

                                    <div className="text-[#AEAEB2] font-bold text-xl">→</div>

                                    <div className={`flex-1 max-w-[280px] p-4 rounded-xl border transition-all duration-500 ${agent2Done ? 'bg-white border-[#34C759]' : 'bg-[#F5F5F7] border-[#EBEBED]'}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2 text-[#0EA5E9]">
                                                <MedicalCrossIcon />
                                                <span className="font-semibold text-sm text-[#1D1D1F]">Medical Context Agent</span>
                                            </div>
                                            {agent2Done ? <CheckIcon /> : agent1Done ? <div className="w-4 h-4 border-2 border-[#EBEBED] border-t-[#0EA5E9] rounded-full animate-spin"></div> : <div className="w-4 h-4 rounded-full bg-[#EBEBED]"></div>}
                                        </div>
                                        {agent2Done && analysisResult && (
                                            <p className="text-xs text-[#86868B] font-medium">Combined score: {analysisResult.final_combined_score}/100</p>
                                        )}
                                        {!agent2Done && <p className="text-xs text-[#86868B] font-medium">Waiting for Agent 1...</p>}
                                    </div>
                                </div>

                                {analysisResult && agent2Done && (
                                    <div className="space-y-6 animate-in fade-in duration-500">

                                        {/* Score Banner */}
                                        <div className="bg-white border border-[#EBEBED] rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
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
                                            <p className="text-xs text-[#86868B] italic mt-4 max-w-sm mx-auto">
                                                This score combines your medication risks ({analysisResult.agent_2_report.medication_risk_score}) + weighted lifestyle factors ({analysisResult.agent_2_report.lifestyle_risk_contribution}).
                                            </p>
                                        </div>

                                        {/* AI Report */}
                                        {analysisResult.ai_report && analysisResult.ai_report.report_text && (
                                            <Card>
                                                <CardContent className="p-6">
                                                    <div className="flex justify-between items-start mb-6">
                                                        <h3 className="text-[11px] uppercase font-bold text-[#0EA5E9] tracking-wider">AI LIFESTYLE REPORT</h3>
                                                        <span className="text-[10px] text-[#86868B]">Generated by {analysisResult.ai_report.model_used}</span>
                                                    </div>

                                                    <div className="mb-6 pb-6 border-b border-[#EBEBED]">
                                                        <p className="text-sm text-[#1D1D1F] font-medium leading-[1.7]">{analysisResult.ai_report.sections.overall_summary}</p>
                                                    </div>

                                                    <div className="space-y-1">
                                                        {['food_changes', 'lifestyle_modifications', 'sleep_and_metabolism'].map((secKey) => (
                                                            <div key={secKey} className="border-b border-[#EBEBED] last:border-0">
                                                                <button
                                                                    onClick={() => setExpandedSections(prev => ({ ...prev, [secKey]: !prev[secKey] }))}
                                                                    className="w-full py-4 flex items-center justify-between text-left focus:outline-none group"
                                                                >
                                                                    <span className="font-semibold text-sm text-[#1D1D1F] group-hover:text-[#0EA5E9] transition-colors capitalize">
                                                                        {secKey.replace(/_/g, " ")}
                                                                    </span>
                                                                    <span className="text-[#86868B]">
                                                                        <ChevronDownIcon expanded={expandedSections[secKey]} />
                                                                    </span>
                                                                </button>
                                                                <div className={`overflow-hidden transition-all duration-300 ${expandedSections[secKey] ? 'max-h-96 pb-4 opacity-100' : 'max-h-0 opacity-0'}`}>
                                                                    <p className="text-sm text-[#86868B] leading-[1.7]">
                                                                        {analysisResult.ai_report.sections[secKey]}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="mt-4 pt-4 border-t border-[#EBEBED] bg-[#F5F5F7] -mx-6 -mb-6 p-6 rounded-b-2xl">
                                                        <p className="text-sm font-medium italic text-[#1D1D1F] text-center">"{analysisResult.ai_report.sections.closing}"</p>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )}

                                        {/* Breakdowns */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Food Risks */}
                                            <div>
                                                <h3 className="font-bold text-[#1D1D1F] text-lg mb-4">Detected Food-Drug Interactions</h3>
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
                                            </div>

                                            {/* Lifestyle Flags */}
                                            <div>
                                                <h3 className="font-bold text-[#1D1D1F] text-lg mb-4">Lifestyle Risk Factors</h3>
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
                                                                {flag.drug_specific_effects.length > 0 && (
                                                                    <ul className="text-[11px] text-[#86868B] space-y-1 list-disc pl-4">
                                                                        {flag.drug_specific_effects.map((fx, fidx) => <li key={fidx}>{fx}</li>)}
                                                                    </ul>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </PatientLayout>
    );
};

export default LifestylePage;
