import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PatientLayout from '../../components/patient/PatientLayout';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import Badge from '../../components/shared/Badge';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { patientService, riskService } from '../../services/api';

const PatientDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Try to fetch profile, catch 404 silently
                try {
                    const res = await patientService.getProfile();
                    setProfile(res.data);
                } catch (err) {
                    if (err.response?.status !== 404) {
                        console.error("Error fetching profile", err);
                    }
                }

                // Fetch risk history
                const res = await riskService.getHistory();
                setHistory(res.data.slice(0, 5)); // Keep only last 5

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

    return (
        <PatientLayout>
            <div className="mb-8">
                <h1 className="text-[28px] font-bold text-[var(--color-text-primary)]">
                    Good {timeOfDay}, {firstName}.
                </h1>
                <p className="text-[var(--color-text-secondary)] mt-1">Here's your medication safety overview.</p>
            </div>

            {/* Profile Completion Banner */}
            {!profile && (
                <div className="bg-[#F0F9FF] border border-[#BAE6FD] rounded-xl px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-3">
                        <svg className="text-[#0EA5E9] shrink-0" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                        <p className="text-sm text-[var(--color-text-primary)] font-medium">Complete your health profile to get personalized risk scores.</p>
                    </div>
                    <Button size="sm" onClick={() => navigate('/patient/profile')} className="whitespace-nowrap w-full sm:w-auto">
                        Set Up Profile
                    </Button>
                </div>
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
                                        style={{ color: latestAssessment.label_color }}
                                    >
                                        {latestAssessment.final_risk_score.toFixed(1)}
                                    </span>
                                    <span className="text-[#86868B] text-[20px] font-medium">/100</span>
                                </div>
                                <div className="mt-2">
                                    <Badge color={latestAssessment.final_risk_category === 'Severe' ? 'red' : latestAssessment.final_risk_category === 'Moderate' ? 'yellow' : 'green'}>
                                        {latestAssessment.final_risk_category} Risk
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
                                <div className="flex items-start gap-2">
                                    <svg className="text-[#FF3B30] shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                                    <p className="text-sm text-[#FF3B30] font-medium">{latestAssessment.clinical_flags[0]}</p>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <svg className="text-[#34C759] shrink-0" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    <p className="text-sm text-[#34C759] font-medium">No critical flags detected.</p>
                                </div>
                            )}
                        </div>
                    </Card>
                ) : (
                    <div className="border-2 border-dashed border-[#EBEBED] bg-white rounded-xl py-12 px-6 flex flex-col items-center justify-center text-center">
                        <svg className="text-[#D1D1D6] mb-4" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.5 20.5 7 24l-3-3L.5 17.5M10.5 20.5l4-4L11 13l-4 4-3.5 3.5M10.5 20.5l3.5-3.5"></path><path d="M14.5 16.5l3.5-3.5L14 9l-3.5 3.5"></path><path d="M18 13l3.5-3.5a3.536 3.536 0 0 0-5-5L13 8l5 5z"></path></svg>
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
                        {profile.egfr ? (
                            <span className={`text-xs font-medium ${profile.egfr >= 60 ? 'text-[#34C759]' : profile.egfr >= 30 ? 'text-[#FF9500]' : 'text-[#FF3B30]'}`}>
                                {profile.egfr >= 60 ? "Normal" : profile.egfr >= 30 ? "Reduced" : "Low"}
                            </span>
                        ) : (
                            <span className="text-xs text-[#86868B]">Update profile</span>
                        )}
                    </Card>

                    <Card className="px-5 py-4 flex flex-col justify-between">
                        <h4 className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-2">Liver Health</h4>
                        <div className="mb-1">
                            <span className="text-2xl font-bold text-[var(--color-text-primary)]">
                                {!profile.liver_score ? "Not set" : profile.liver_score === 1 ? "Normal" : profile.liver_score === 2 ? "Mild" : "Impaired"}
                            </span>
                        </div>
                        <span className="text-xs font-medium text-[var(--color-text-muted)]">
                            {profile.liver_score === 1 ? "No adjustment" : profile.liver_score ? "Affects metabolism" : "Update profile"}
                        </span>
                    </Card>

                    <Card className="px-5 py-4 flex flex-col justify-between">
                        <h4 className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-2">Age Group</h4>
                        <div className="mb-1">
                            <span className="text-2xl font-bold text-[var(--color-text-primary)]">{profile.age ? profile.age + " years" : "Not set"}</span>
                        </div>
                        <span className="text-xs font-medium text-[var(--color-text-muted)]">
                            {profile.age >= 65 ? "Enhanced monitoring" : profile.age ? "Standard baseline" : "Update profile"}
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
                                        <span className="text-lg font-bold leading-none" style={{ color: item.label_color }}>
                                            {item.final_risk_score.toFixed(1)}
                                        </span>
                                        <Badge color={item.final_risk_category === 'Severe' ? 'red' : item.final_risk_category === 'Moderate' ? 'yellow' : 'green'} className="scale-90 origin-right mt-1">
                                            {item.final_risk_category}
                                        </Badge>
                                    </div>
                                    <Button variant="ghost" size="sm" className="px-2" onClick={() => navigate('/patient/history')}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
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
