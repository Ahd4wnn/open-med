import React from 'react';

const CoTExplanation = ({ steps, loading, error, modelUsed }) => {
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

            {modelUsed && (
                <div className="mt-8 pt-4 border-t border-[#EBEBED] text-right">
                    <p className="text-[11px] text-[#A1A1A6]">Analysis by {modelUsed}</p>
                </div>
            )}
        </div>
    );
};

export default CoTExplanation;
