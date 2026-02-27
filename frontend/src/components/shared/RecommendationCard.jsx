import React from 'react';
import { AlertTriangle } from "lucide-react";
import Card from './Card';
import Badge from './Badge';

const RecommendationCard = ({ recommendation }) => {
    if (!recommendation) return null;

    return (
        <Card className="border-l-[3px] border-l-[#FF9500] bg-[#FFFBEB] rounded-r-xl p-4 mb-3 shadow-none">
            <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-[#FF9500] mt-0.5 shrink-0" />
                    <h4 className="text-sm font-semibold text-[#1D1D1F]">
                        {recommendation.problematic_drug} may interact with {recommendation.interacts_with}
                    </h4>
                </div>
                <Badge color={recommendation.severity === 'Severe' || recommendation.severity === 'Contraindicated' ? 'red' : 'yellow'} className="shrink-0 ml-4">
                    {recommendation.severity}
                </Badge>
            </div>

            <p className="text-sm text-[#515154] mt-1 pl-6">
                {recommendation.recommendation_note}
            </p>

            {recommendation.alternatives && recommendation.alternatives.length > 0 && (
                <div className="mt-3 pl-6">
                    <p className="text-[10px] uppercase tracking-wider text-[#86868B] font-semibold mb-2">Safer Alternatives</p>
                    <div className="space-y-3">
                        {recommendation.alternatives.map((alt, idx) => (
                            <div key={idx} className="flex flex-col items-start gap-1">
                                <div className="flex items-center gap-2">
                                    <span className="bg-white border border-[#EBEBED] rounded-full px-3 py-1 text-xs font-medium text-[#1D1D1F] shadow-sm">
                                        {alt.name}
                                    </span>
                                    <span className="text-[11px] text-[#86868B]">{alt.drug_class}</span>
                                </div>
                                <p className="text-xs text-[#515154] italic ml-1">— {alt.reason}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </Card>
    );
};

export default RecommendationCard;
