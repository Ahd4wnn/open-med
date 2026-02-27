import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PatientLayout from '../../components/patient/PatientLayout';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import Badge from '../../components/shared/Badge';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { patientService, riskService } from '../../services/api';
import { AlertCircle, AlertTriangle, Check, Pill, ArrowRight, Info, CheckCircle2 } from "lucide-react";

const PatientDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [profileRes, historyRes] = await Promise.allSettled([
                    patientService.getProfile(),
                    riskService.getHistory()
                ]);

                if (profileRes.status === "fulfilled") {
                    setProfile(profileRes.value.data);
                } else {
                    setProfile(null);
                }

                if (historyRes.status === "fulfilled") {
                    setHistory(historyRes.value.data.slice(0, 5));
                } else {
                    setHistory([]);
                }
            } catch (err) {
                console.error("Dashboard data fetch failed", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const firstName = user?.full_name ? user.full_name.split(' ')[0] : 'Patient';

    // Determine time of day
    const hour = new Date().getHours();
    let timeOfDay = 'evening';
    if (hour < 12) timeOfDay = 'morning';
    else if (hour < 17) timeOfDay = 'afternoon';

    // Format relative date for assessment
    const getRelativeDate = (dateString) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    if (loading) return <PatientLayout><LoadingSpinner message="Loading your dashboard..." /></PatientLayout>;

    const latestAssessment = history.length > 0 ? history[0] : null;

    const getScoreColor = (score, category) => {
        if (category === "Severe" || score >= 55) return "#EF4444";
        if (category === "Moderate" || score >= 25) return "#F59E0B";
        return "#10B981";
    };

    const getLabelColor = (category) => {
        if (category === "Severe") return "red";
        if (category === "Moderate") return "yellow";
        return "green";
    };

    return (
        <PatientLayout>
            <div className="mb-8">
                <h1 className="text-[28px] font-bold text-[var(--color-text-primary)]">
                    Good {timeOfDay}, {firstName}.
                </h1>
                <p className="text-[var(--color-text-secondary)] mt-1">Here's your medication safety overview.</p>
            </div>

            {/* Profile Completion Banner */}
            {profile === null && !loading && (
                <Card className="bg-[#F0F9FF] border border-[#BAE6FD] rounded-xl px-5 py-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="text-[#0EA5E9] shrink-0" size={18} />
                        <div>
                            <p className="text-sm font-[600] text-[var(--color-text-primary)]">Complete your health profile</p>
                            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Get personalized risk scores based on your age, kidney and liver function.</p>
                        </div>
                    </div>
                    <Button size="sm" onClick={() => navigate('/patient/profile')} className="whitespace-nowrap w-full sm:w-auto">
                        Set Up Profile
                    </Button>
                </Card>
            )}

            {/* Latest Assessment Hero */}
            <div className="mb-8">
                {latestAssessment ? (
                    <Card className="p-6">
                        <div className="flex justify-between items-center border-b border-[#EBEBED] pb-3 mb-4">
                            <span className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Latest Risk Assessment</span>
                            <span className="text-xs text-[var(--color-text-muted)] font-medium">{getRelativeDate(latestAssessment.created_at)}</span>
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
                            {/* Score Box */}
                            <div className="shrink-0 flex flex-col items-center">
                                <div className="flex items-baseline gap-1">
                                    <span
                                        className="text-[64px] font-bold leading-none tracking-tight"
                                        style={{ color: getScoreColor(latestAssessment.risk_score, latestAssessment.risk_category) }}
                                    >
                                        {latestAssessment?.risk_score?.toFixed(1) || '0.0'}
                                    </span>
                                    <span className="text-[#86868B] text-[20px] font-medium">/100</span>
                                </div>
                                <div className="mt-2">
                                    <Badge color={getLabelColor(latestAssessment.risk_category)}>
                                        {latestAssessment.risk_category} Risk
                                    </Badge>
                                </div>
                            </div>

                            {/* Medications */}
                            <div className="flex-1 min-w-0">
                                <h4 className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-2">Medications Analyzed</h4>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {latestAssessment.drug_names.map(drug => (
                                        <div key={drug} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full px-3 py-1 text-xs font-medium text-[var(--color-text-primary)]">
                                            {drug}
                                        </div>
                                    ))}
                                </div>
                                <p className="text-sm text-[var(--color-text-muted)]">
                                    {latestAssessment.total_interactions} interaction(s) detected
                                </p>
                            </div>
                        </div>

                        {/* Top Flag / Success */}
                        <div className="mt-5 pt-4 border-t border-[#EBEBED]">
                            {latestAssessment.clinical_flags && latestAssessment.clinical_flags.length > 0 ? (
                                (() => {
                                    const flag = latestAssessment.clinical_flags[0] || "";
                                    const flagType = flag.includes("HIGH RISK") || flag.includes("CONTRAINDICATED") || flag.includes("MAJOR")
                                        ? "danger"
                                        : flag.includes("MODERATE") || flag.includes("RENAL") || flag.includes("HEPATIC") || flag.includes("ELDERLY") || flag.includes("POLYPHARMACY")
                                            ? "warning"
                                            : "info";

                                    return (
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                {flagType === "danger" && <AlertTriangle size={14} className="text-red-500 shrink-0" />}
                                                {flagType === "warning" && <AlertTriangle size={14} className="text-yellow-500 shrink-0" />}
                                                {flagType === "info" && <Info size={14} className="text-blue-500 shrink-0" />}

                                                <p className={`text-sm font-medium ${flagType === "danger" ? "text-red-600" : flagType === "warning" ? "text-yellow-700" : "text-blue-600"}`}>
                                                    {flag}
                                                </p>
                                            </div>
                                            {latestAssessment.clinical_flags.length > 1 && (
                                                <p className="text-xs text-[#86868B] mt-1 ml-5 cursor-pointer hover:underline" onClick={() => navigate('/patient/medications')}>
                                                    +{latestAssessment.clinical_flags.length - 1} more warnings
                                                </p>
                                            )}
                                        </div>
                                    );
                                })()
                            ) : (
                                (latestAssessment.risk_score < 25) ? (
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                                        <p className="text-sm text-green-600 font-medium">No critical flags detected.</p>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle size={14} className="text-yellow-500 shrink-0" />
                                        <p className="text-sm text-yellow-700 font-medium">Moderate risk detected. Review your medications.</p>
                                    </div>
                                )
                            )}
                        </div>
                    </Card>
                ) : (
                    <div className="border-2 border-dashed border-[#EBEBED] bg-white rounded-xl py-12 px-6 flex flex-col items-center justify-center text-center">
                        <Pill className="text-[#D1D1D6] mb-4" size={48} />
                        <h3 className="text-lg font-bold text-[#1D1D1F]">No assessments yet</h3>
                        <p className="text-[#86868B] mt-1 mb-6">Check your medications for potential interactions.</p>
                        <Button onClick={() => navigate('/patient/medications')}>Run First Check</Button>
                    </div>
                )}
            </div>

            {/* Quick Stats (Only show if profile exists) */}
            {profile && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <Card className="px-5 py-4 flex flex-col justify-between">
                        <h4 className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-2">Kidney Function</h4>
                        <div className="mb-1">
                            <span className="text-2xl font-bold text-[var(--color-text-primary)]">{profile.egfr ? profile.egfr + " eGFR" : "Not set"}</span>
                        </div>
                        <span className={`text-xs font-medium ${!profile.egfr ? 'text-[#86868B]' : profile.egfr >= 60 ? 'text-[#34C759]' : profile.egfr >= 30 ? 'text-[#FF9500]' : 'text-[#FF3B30]'}`}>
                            {!profile.egfr ? "—" : profile.egfr >= 60 ? "Normal" : profile.egfr >= 30 ? "Reduced" : "Low"}
                        </span>
                    </Card>

                    <Card className="px-5 py-4 flex flex-col justify-between">
                        <h4 className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-2">Liver Health</h4>
                        <div className="mb-1">
                            <span className="text-2xl font-bold text-[var(--color-text-primary)]">
                                {profile.liver_score === 1 ? "Normal" : profile.liver_score === 2 ? "Mild" : profile.liver_score === 3 ? "Impaired" : "Not set"}
                            </span>
                        </div>
                        <span className={`text-xs font-medium ${!profile.liver_score ? 'text-[var(--color-text-muted)]' : profile.liver_score === 1 ? 'text-[var(--color-text-muted)]' : profile.liver_score === 2 ? 'text-[#FF9500]' : 'text-[#FF3B30]'}`}>
                            {!profile.liver_score ? "—" : profile.liver_score === 1 ? "No adjustment" : profile.liver_score === 2 ? "Affects metabolism" : "High impact"}
                        </span>
                    </Card>

                    <Card className="px-5 py-4 flex flex-col justify-between">
                        <h4 className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-2">Age Group</h4>
                        <div className="mb-1">
                            <span className="text-2xl font-bold text-[var(--color-text-primary)]">{profile.age ? profile.age + " years" : "Not set"}</span>
                        </div>
                        <span className={`text-xs font-medium ${!profile.age ? 'text-[var(--color-text-muted)]' : profile.age >= 75 ? 'text-[#FF9500]' : profile.age >= 65 ? 'text-[#FF9500]' : 'text-[var(--color-text-muted)]'}`}>
                            {!profile.age ? "—" : profile.age >= 75 ? "Enhanced monitoring" : profile.age >= 65 ? "Elderly baseline" : "Standard baseline"}
                        </span>
                    </Card>
                </div>
            )}

            {/* Recent History List */}
            {history.length > 1 && (
                <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Recent Checks</h3>
                    <Card className="px-6 py-2">
                        {history.slice(1, 4).map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center py-4 border-b border-[#EBEBED] last:border-0">
                                <div className="flex-1 min-w-0 pr-4">
                                    <h4 className="text-sm font-semibold text-[#1D1D1F] truncate" title={item.drug_names.join(' + ')}>
                                        {item.drug_names.join(' + ')}
                                    </h4>
                                    <p className="text-xs text-[#86868B] mt-1">{new Date(item.created_at).toLocaleDateString()}</p>
                                </div>
                                <div className="flex items-center gap-4 shrink-0">
                                    <div className="flex flex-col items-end">
                                        <span className="text-lg font-bold leading-none" style={{ color: getScoreColor(item.risk_score, item.risk_category) }}>
                                            {item?.risk_score?.toFixed(1) || '0.0'}
                                        </span>
                                        <Badge color={getLabelColor(item.risk_category)} className="scale-90 origin-right mt-1">
                                            {item.risk_category}
                                        </Badge>
                                    </div>
                                    <Button variant="ghost" size="sm" className="px-2" onClick={() => navigate('/patient/history')}>
                                        <ArrowRight size={16} />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </Card>
                </div>
            )}
        </PatientLayout>
    );
};

export default PatientDashboard;
