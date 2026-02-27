import React, { useState, useEffect } from 'react';
import DoctorLayout from '../../components/doctor/DoctorLayout';
import Card from '../../components/shared/Card';
import Badge from '../../components/shared/Badge';
import Button from '../../components/shared/Button';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { riskService } from '../../services/api';

const ExpandedRowDetails = ({ assessment }) => {
    return (
        <div className="bg-[#F9F9FB] border border-[#EBEBED] rounded-b-lg px-6 py-5 shadow-inner mt-[-1px]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Multipliers */}
                <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#86868B] mb-3">Risk Multipliers</h4>
                    <div className="space-y-2">
                        {Object.entries(assessment.multipliers || {}).map(([key, value]) => (
                            <div key={key} className="flex justify-between items-center text-sm">
                                <span className="text-[#515154] capitalize">{key.replace('_', ' ')}</span>
                                <span className={`font-medium ${value > 1.0 ? 'text-[#FF9500]' : 'text-[#86868B]'}`}>×{value.toFixed(1)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Flags */}
                {assessment.clinical_flags && assessment.clinical_flags.length > 0 && (
                    <div className="lg:col-span-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#86868B] mb-3">Clinical Flags</h4>
                        <div className="space-y-2">
                            {assessment.clinical_flags.map((flag, idx) => (
                                <div key={idx} className="text-sm text-[#FF3B30] flex gap-2 items-start">
                                    <span className="shrink-0">•</span>
                                    <span>{flag}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-4 pt-4 border-t border-[#EBEBED]">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#86868B] mb-3">Key Interactions</h4>
                <p className="text-sm text-[#515154]">{assessment.recommendations}</p>
            </div>
        </div>
    );
};

const HistoryPage = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedRows, setExpandedRows] = useState(new Set());

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await riskService.getHistory();
                setHistory(res.data);
            } catch (err) {
                console.error("Failed to fetch history", err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const toggleRow = (id) => {
        const next = new Set(expandedRows);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setExpandedRows(next);
    };

    if (loading) return <DoctorLayout><LoadingSpinner message="Loading assessment history..." /></DoctorLayout>;

    return (
        <DoctorLayout>
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">Assessment History</h2>
                <p className="text-sm text-[#86868B] mt-1">Review your past risk assessments and patient analyses.</p>
            </div>

            {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 text-center border-2 border-dashed border-[#EBEBED] rounded-2xl bg-white">
                    <svg className="text-[#D1D1D6] mb-4" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    <h3 className="text-lg font-semibold text-[#1D1D1F]">No assessments yet</h3>
                    <p className="text-[#86868B] mt-2">Use the Drug Analyzer to run your first patient assessment.</p>
                </div>
            ) : (
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="border-b border-[var(--color-border)] bg-[#FAFAFA]">
                                    <th className="px-5 py-4 text-[11px] uppercase tracking-wider text-[#86868B] font-semibold w-[35%]">Medications</th>
                                    <th className="px-5 py-4 text-[11px] uppercase tracking-wider text-[#86868B] font-semibold">Interactions</th>
                                    <th className="px-5 py-4 text-[11px] uppercase tracking-wider text-[#86868B] font-semibold">Risk Score</th>
                                    <th className="px-5 py-4 text-[11px] uppercase tracking-wider text-[#86868B] font-semibold">Category</th>
                                    <th className="px-5 py-4 text-[11px] uppercase tracking-wider text-[#86868B] font-semibold">Date</th>
                                    <th className="px-5 py-4 text-[11px] uppercase tracking-wider text-[#86868B] font-semibold text-right">Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((assessment) => {
                                    const isExpanded = expandedRows.has(assessment.id);
                                    const drugList = assessment.drug_names.join(', ');
                                    const truncated = drugList.length > 40 ? drugList.substring(0, 40) + '...' : drugList;
                                    const badgeColor = assessment.final_risk_category === 'Severe' ? 'red' : assessment.final_risk_category === 'Moderate' ? 'yellow' : 'green';
                                    const scoreColor = assessment.final_risk_category === 'Severe' ? '#FF3B30' : assessment.final_risk_category === 'Moderate' ? '#FF9500' : '#34C759';

                                    return (
                                        <React.Fragment key={assessment.id}>
                                            <tr className={`border-b border-[#EBEBED] transition-colors ${isExpanded ? 'bg-[#FAFAFA]' : 'hover:bg-[#F9F9FB]'}`}>
                                                <td className="px-5 py-4 text-sm font-medium text-[#1D1D1F]" title={drugList}>{truncated}</td>
                                                <td className="px-5 py-4 text-sm text-[#515154]">
                                                    <span className="font-semibold text-[#1D1D1F]">{assessment.total_interactions}</span> pairs
                                                </td>
                                                <td className="px-5 py-4 text-sm font-semibold" style={{ color: scoreColor }}>
                                                    {assessment.final_risk_score.toFixed(1)}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <Badge color={badgeColor}>{assessment.final_risk_category}</Badge>
                                                </td>
                                                <td className="px-5 py-4 text-sm text-[#86868B]">
                                                    {new Date(assessment.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <Button variant="ghost" size="sm" onClick={() => toggleRow(assessment.id)}>
                                                        {isExpanded ? 'Close' : 'View'}
                                                    </Button>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan="6" className="p-0 border-b border-[#EBEBED]">
                                                        <ExpandedRowDetails assessment={assessment} />
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </DoctorLayout>
    );
};

export default HistoryPage;
