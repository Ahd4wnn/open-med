import React from 'react';
import { FlaskConical } from "lucide-react";

const CoTExplanation = ({ steps, loading, error, modelUsed, deepResearch, deepResearchLoading }) => {
    if (loading) {
        return (
            <div className="py-6 px-2 animate-pulse">
                <div className="h-4 bg-[#EBEBED] rounded mb-4 w-3/4"></div>
                <div className="h-4 bg-[#EBEBED] rounded mb-4 w-5/6"></div>
                <div className="h-4 bg-[#EBEBED] rounded mb-6 w-1/2"></div>
                <p className="text-sm text-[#86868B]">Generating clinical analysis...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="py-4 px-2">
                <p className="text-sm text-[#86868B]">AI explanation unavailable. {error}</p>
            </div>
        );
    }

    if (!steps || steps.length === 0) {
        return null;
    }

    return (
        <div className="py-2">
            {steps.map((step) => {
                const isSummary = step.step === 5 || step.title === "Patient Summary";

                if (isSummary) {
                    return (
                        <div key={step.step} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 mt-6 mb-2">
                            <h4 className="text-[11px] uppercase tracking-wider text-[var(--color-accent)] font-semibold mb-2">Patient Summary</h4>
                            <p className="text-sm text-[var(--color-text-primary)] font-medium leading-relaxed">
                                {step.content}
                            </p>
                        </div>
                    );
                }

                return (
                    <div key={step.step} className="mb-5 border-l-2 border-[#EBEBED] pl-4 ml-2 relative">
                        {/* Dot on the timeline */}
                        <div className="absolute -left-[11px] top-0 w-[20px] h-[20px] rounded-full bg-white border-2 border-[#EBEBED] flex items-center justify-center text-[10px] font-bold text-[#86868B]">
                            {step.step}
                        </div>

                        <h4 className="text-sm font-semibold text-[#1D1D1F] leading-tight mb-1.5 pt-0.5">
                            {step.title}
                        </h4>
                        <p className="text-sm text-[#515154] leading-relaxed">
                            {step.content}
                        </p>
                    </div>
                );
            })}

            {deepResearchLoading ? (
                <div className="mt-8 border-t border-[#EBEBED] pt-6 animate-pulse">
                    <div className="flex items-center mb-4">
                        <FlaskConical size={16} className="text-[var(--color-accent)] shrink-0" />
                        <span className="text-[11px] uppercase tracking-wider text-[var(--color-accent)] font-semibold ml-2">DEEP RESEARCH ANALYSIS</span>
                    </div>
                    <div className="h-4 bg-[#EBEBED] rounded mb-3 w-full"></div>
                    <div className="h-4 bg-[#EBEBED] rounded mb-3 w-5/6"></div>
                    <div className="h-4 bg-[#EBEBED] rounded mb-3 w-4/6"></div>
                </div>
            ) : deepResearch?.sections ? (
                <div className="mt-8 border-t border-[#EBEBED] pt-6">
                    <div className="flex items-center mb-6">
                        <FlaskConical size={16} className="text-[var(--color-accent)] shrink-0" />
                        <h4 className="text-[11px] uppercase tracking-wider text-[var(--color-accent)] font-semibold ml-2">DEEP RESEARCH ANALYSIS</h4>
                        {deepResearch.model_used && (
                            <span className="text-xs bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full px-2 py-0.5 ml-auto text-[var(--color-text-muted)]">
                                {deepResearch.model_used}
                            </span>
                        )}
                    </div>

                    {['pharmacokinetic', 'pharmacodynamic', 'highest_risk', 'monitoring', 'clinical_bottom_line'].map((secKey) => {
                        const content = deepResearch.sections[secKey];
                        if (!content) return null;

                        const titleMap = {
                            pharmacokinetic: "Pharmacokinetic Analysis",
                            pharmacodynamic: "Pharmacodynamic Analysis",
                            highest_risk: "⚠ Highest Risk Concern",
                            monitoring: "Monitoring Parameters",
                            clinical_bottom_line: "Clinical Bottom Line"
                        };

                        if (secKey === 'clinical_bottom_line') {
                            return (
                                <div key={secKey} className="mb-4 bg-[var(--color-surface)] rounded-xl p-4 border-l-[3px] border-[var(--color-accent)] shadow-sm">
                                    <h5 className="text-xs uppercase font-semibold text-[var(--color-text-muted)] mb-1.5">{titleMap[secKey]}</h5>
                                    <p className="text-sm text-[var(--color-text-primary)] font-medium leading-relaxed">{content}</p>
                                </div>
                            );
                        }

                        return (
                            <div key={secKey} className="mb-5">
                                <h5 className="text-xs uppercase font-semibold text-[var(--color-text-muted)] mb-1.5">{titleMap[secKey]}</h5>
                                <p className="text-sm text-[#515154] leading-relaxed whitespace-pre-line">{content}</p>
                            </div>
                        );
                    })}
                </div>
            ) : deepResearch?.error ? (
                <div className="mt-8 border-t border-[#EBEBED] pt-6">
                    <p className="text-sm text-[#86868B]">Deep research analysis unavailable. {deepResearch.error}</p>
                </div>
            ) : null}

            {modelUsed && !deepResearch?.sections && (
                <div className="mt-8 pt-4 border-t border-[#EBEBED] text-right">
                    <p className="text-[11px] text-[#A1A1A6]">Analysis by {modelUsed}</p>
                </div>
            )}
        </div>
    );
};

export default CoTExplanation;
