import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DoctorLayout from '../../components/doctor/DoctorLayout';
import Card from '../../components/shared/Card';
import Badge from '../../components/shared/Badge';
import Button from '../../components/shared/Button';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { riskService } from '../../services/api';

const DoctorDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState([]);
    const [history, setHistory] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [summaryData, historyData] = await Promise.all([
                    riskService.getDoctorSummary(),
                    riskService.getHistory()
                ]);
                setSummary(summaryData);
                setHistory(historyData);
            } catch (err) {
                console.error("Dashboard fetch error", err);
                setError('Failed to load dashboard data.');
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    if (loading) return <DoctorLayout><LoadingSpinner message="Loading dashboard..." /></DoctorLayout>;

    // Calculate Stats
    const totalPatients = summary.length;
    const highRiskPatients = summary.filter(s => s.latest_risk_category === 'Severe').length;

    const today = new Date().toISOString().split('T')[0];
    const assessmentsToday = history.filter(h => h.created_at.startsWith(today)).length;

    const avgRiskScore = summary.length > 0
        ? summary.reduce((acc, curr) => acc + curr.latest_risk_score, 0) / summary.length
        : 0;

    // Distribution
    const distribution = {
        Severe: summary.filter(s => s.latest_risk_category === 'Severe').length,
        Moderate: summary.filter(s => s.latest_risk_category === 'Moderate').length,
        Low: summary.filter(s => s.latest_risk_category === 'Low').length,
    };

    return (
        <DoctorLayout>
            {error && <div className="mb-4 text-sm text-[var(--color-danger)] p-3 bg-red-50 rounded-lg">{error}</div>}

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card className="px-5 py-4">
                    <h3 className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Total Patients</h3>
                    <p className="text-[32px] font-bold text-[var(--color-text-primary)] mt-1">{totalPatients}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">Unique profiles</p>
                </Card>
                <Card className="px-5 py-4">
                    <h3 className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">High Risk Patients</h3>
                    <p className="text-[32px] font-bold text-[var(--color-text-primary)] mt-1">{highRiskPatients}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">Requires attention</p>
                </Card>
                <Card className="px-5 py-4">
                    <h3 className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Assessments Today</h3>
                    <p className="text-[32px] font-bold text-[var(--color-text-primary)] mt-1">{assessmentsToday}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">Conducted by you</p>
                </Card>
                <Card className="px-5 py-4">
                    <h3 className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Avg Risk Score</h3>
                    <p className="text-[32px] font-bold text-[var(--color-text-primary)] mt-1">{avgRiskScore.toFixed(1)}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">Across all patients</p>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column - Patient List */}
                <div className="lg:col-span-7 xl:col-span-8">
                    <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Patients by Risk</h2>
                    <Card className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                                        <th className="px-4 py-3 text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Patient</th>
                                        <th className="px-4 py-3 text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Risk Score</th>
                                        <th className="px-4 py-3 text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Category</th>
                                        <th className="px-4 py-3 text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Date</th>
                                        <th className="px-4 py-3 text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summary.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-4 py-8 text-center text-[var(--color-text-secondary)]">
                                                No patient assessments yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        summary.sort((a, b) => b.latest_risk_score - a.latest_risk_score).slice(0, 8).map((patient, idx) => {
                                            const badgeColor = patient.latest_risk_category === 'Severe' ? 'red' : patient.latest_risk_category === 'Moderate' ? 'yellow' : 'green';
                                            return (
                                                <tr key={idx} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[#F9F9FB] transition-colors">
                                                    <td className="px-4 py-3 text-sm font-medium text-[var(--color-text-primary)]">{patient.patient_name}</td>
                                                    <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">{patient.latest_risk_score.toFixed(1)}</td>
                                                    <td className="px-4 py-3"><Badge color={badgeColor}>{patient.latest_risk_category}</Badge></td>
                                                    <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">
                                                        {new Date(patient.latest_assessment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <Button variant="ghost" size="sm" onClick={() => navigate('/doctor/patients')}>View</Button>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>

                {/* Right Column - Distribution & Activity */}
                <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
                    <div>
                        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Risk Distribution</h2>
                        <Card className="p-5">
                            {['Severe', 'Moderate', 'Low'].map((cat) => {
                                const count = distribution[cat];
                                const total = totalPatients || 1;
                                const pct = (count / total) * 100;
                                const barColor = cat === 'Severe' ? 'bg-[#FF3B30]' : cat === 'Moderate' ? 'bg-[#FF9500]' : 'bg-[#34C759]';

                                return (
                                    <div key={cat} className="mb-4 last:mb-0">
                                        <div className="flex justify-between items-end mb-1.5">
                                            <span className="text-sm font-medium text-[var(--color-text-primary)]">{cat}</span>
                                            <span className="text-xs font-semibold text-[var(--color-text-secondary)]">{count}</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-[#EBEBED] rounded-full overflow-hidden">
                                            <div className={`h-full ${barColor} rounded-full`} style={{ width: `${pct}%` }}></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </Card>
                    </div>

                    <div>
                        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Recent Activity</h2>
                        <Card className="p-5">
                            {history.length === 0 ? (
                                <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">No recent activity.</p>
                            ) : (
                                <div className="space-y-3">
                                    {history.slice(0, 5).map((item, idx) => {
                                        const badgeColor = item.final_risk_category === 'Severe' ? 'red' : item.final_risk_category === 'Moderate' ? 'yellow' : 'green';
                                        const drugList = item.drug_names.join(', ');
                                        const truncatedDrugs = drugList.length > 32 ? drugList.substring(0, 32) + '...' : drugList;

                                        return (
                                            <div key={idx} className="flex justify-between items-center pb-3 border-b border-[#EBEBED] last:border-0 last:pb-0">
                                                <div className="flex items-center gap-2">
                                                    <svg className="text-[#86868B]" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.5 20.5 7 24l-3-3L.5 17.5M10.5 20.5l4-4L11 13l-4 4-3.5 3.5M10.5 20.5l3.5-3.5"></path><path d="M14.5 16.5l3.5-3.5L14 9l-3.5 3.5"></path><path d="M18 13l3.5-3.5a3.536 3.536 0 0 0-5-5L13 8l5 5z"></path></svg>
                                                    <span className="text-sm text-[var(--color-text-primary)]" title={drugList}>{truncatedDrugs}</span>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <Badge color={badgeColor}>{item.final_risk_category}</Badge>
                                                    <span className="text-[10px] text-[#86868B] mt-1">
                                                        {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            </div>
        </DoctorLayout>
    );
};

export default DoctorDashboard;
