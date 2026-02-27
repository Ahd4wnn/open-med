import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PatientLayout from '../../components/patient/PatientLayout';
import Card from '../../components/shared/Card';
import Badge from '../../components/shared/Badge';
import Button from '../../components/shared/Button';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { riskService } from '../../services/api';

const PatientHistoryPage = () => {
    const navigate = useNavigate();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedIds, setExpandedIds] = useState(new Set());

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const data = await riskService.getHistory();
                setHistory(data);
            } catch (err) {
                console.error("Failed to fetch history", err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const toggleExpand = (id) => {
        const newSet = new Set(expandedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedIds(newSet);
    };

    if (loading) return <PatientLayout><LoadingSpinner message="Loading your check history..." /></PatientLayout>;

    return (
        <PatientLayout>
            <div className="mb-8">
                <h1 className="text-[28px] font-bold text-[var(--color-text-primary)]">Risk History</h1>
                <p className="text-[var(--color-text-secondary)] mt-1">Your past medication checks.</p>
            </div>

            {history.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-center">
                    <svg className="text-[#D1D1D6] mb-4" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    <h3 className="text-lg font-semibold text-[#1D1D1F]">No checks yet</h3>
                    <p className="text-[#86868B] mt-1 mb-6">You haven't checked any medications for interactions.</p>
                    <Button onClick={() => navigate('/patient/medications')}>Check Medications</Button>
                </div>
            ) : (
                <div className="space-y-4">
                    {history.map(assessment => {
                        const isExpanded = expandedIds.has(assessment.id);
                        const drugs = assessment.drug_names;
                        const visibleDrugs = drugs.slice(0, 4);
                        const remaining = drugs.length > 4 ? drugs.length - 4 : 0;
                        const badgeColor = assessment.final_risk_category === 'Severe' ? 'red' : assessment.final_risk_category === 'Moderate' ? 'yellow' : 'green';

                        return (
                            <Card key={assessment.id} className="p-5 hover:shadow-md transition-shadow">
                                {/* Top Row */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex flex-wrap gap-1.5">
                                        {visibleDrugs.map(drug => (
                                            <span key={drug} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full px-2 py-0.5 text-xs font-medium text-[var(--color-text-primary)]">
                                                {drug}
                                            </span>
                                        ))}
                                        {remaining > 0 && (
                                            <span className="bg-[#F5F5F7] rounded-full px-2 py-0.5 text-xs font-medium text-[#86868B]">
                                                +{remaining} more
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs text-[#86868B] whitespace-nowrap ml-4">
                                        {new Date(assessment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                </div>

                                {/* Middle Row */}
                                <div className="flex items-center gap-4">
                                    <span className="font-bold text-2xl leading-none" style={{ color: assessment.label_color }}>
                                        {assessment.final_risk_score.toFixed(1)}
                                    </span>
                                    <Badge color={badgeColor}>{assessment.final_risk_category}</Badge>
                                    <span className="text-sm text-[#86868B] ml-2">
                                        {assessment.total_interactions} interaction(s)
                                    </span>
                                </div>

                                {/* Bottom Row (Expandable) */}
                                <div className="mt-4 pt-4 border-t border-[#EBEBED]">
                                    {isExpanded ? (
                                        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                            {/* Flags */}
                                            {assessment.clinical_flags && assessment.clinical_flags.length > 0 && (
                                                <div className="mb-4 space-y-2">
                                                    {assessment.clinical_flags.map((flag, i) => (
                                                        <div key={i} className="flex gap-2 text-sm text-[#FF3B30]">
                                                            <span className="shrink-0">•</span>
                                                            <span>{flag}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Top Interactions (Simplified) */}
                                            {assessment.interactions && assessment.interactions.length > 0 && (
                                                <div className="space-y-3 mb-4">
                                                    {assessment.interactions.slice(0, 2).map((interaction, i) => (
                                                        <div key={i} className="text-sm">
                                                            <span className="font-medium text-[#1D1D1F]">⚠ {interaction.drug1} + {interaction.drug2}</span>
                                                            <p className="text-[#515154] mt-1 text-xs">{interaction.recommendation || "Consult your provider regarding this mix."}</p>
                                                        </div>
                                                    ))}
                                                    {assessment.interactions.length > 2 && (
                                                        <p className="text-xs text-[#86868B] italic">...and {assessment.interactions.length - 2} more minor interactions.</p>
                                                    )}
                                                </div>
                                            )}

                                            <button onClick={() => toggleExpand(assessment.id)} className="text-sm font-medium text-[#0EA5E9] hover:underline">
                                                Hide Details
                                            </button>
                                        </div>
                                    ) : (
                                        <button onClick={() => toggleExpand(assessment.id)} className="text-sm font-medium text-[#0EA5E9] hover:underline">
                                            Show Details
                                        </button>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </PatientLayout>
    );
};

export default PatientHistoryPage;
