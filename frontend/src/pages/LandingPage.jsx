import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Pill, Shield, Activity } from "lucide-react";
import Button from '../components/shared/Button';

const LandingPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[var(--color-bg)] flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-5xl mx-auto flex flex-col items-center flex-1 justify-center space-y-16">

                {/* Hero Section */}
                <div className="flex flex-col items-center text-center space-y-6 max-w-2xl mt-12">
                    <span className="text-[11px] uppercase tracking-[0.1em] font-semibold text-[var(--color-accent)]">
                        Clinical Decision Support
                    </span>
                    <h1 className="text-4xl md:text-5xl lg:text-[56px] font-bold leading-tight tracking-tight text-[var(--color-text-primary)]">
                        Medication Safety,<br />
                        <span className="text-[var(--color-text-muted)]">Made Intelligent.</span>
                    </h1>
                    <p className="text-base md:text-lg text-[var(--color-text-secondary)] max-w-[480px] leading-relaxed">
                        OpenMed analyzes drug combinations in real time, identifying dangerous interactions and personalizing risk scores based on your unique clinical profile.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
                        <Button size="lg" onClick={() => navigate('/register')} className="w-full sm:w-auto px-8">
                            Get Started
                        </Button>
                        <Button variant="secondary" size="lg" onClick={() => navigate('/login')} className="w-full sm:w-auto px-8">
                            Sign In
                        </Button>
                    </div>
                </div>

                {/* Features Row */}
                <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
                    {/* Card 1 */}
                    <div className="bg-white border border-[var(--color-border)] rounded-2xl p-8 flex flex-col items-start shadow-sm">
                        <Pill size={24} color="var(--color-accent)" className="mb-4" />
                        <h3 className="text-[17px] font-semibold text-[var(--color-text-primary)] mb-2">Multi-Drug Analysis</h3>
                        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                            Analyze up to 20 medications simultaneously. Detect interactions across every drug pair with severity classification.
                        </p>
                    </div>

                    {/* Card 2 */}
                    <div className="bg-white border border-[var(--color-border)] rounded-2xl p-8 flex flex-col items-start shadow-sm">
                        <Shield size={24} color="var(--color-accent)" className="mb-4" />
                        <h3 className="text-[17px] font-semibold text-[var(--color-text-primary)] mb-2">Personalized Risk Score</h3>
                        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                            Risk scores adjusted for age, kidney function, liver health, and polypharmacy load. Fully explainable breakdowns.
                        </p>
                    </div>

                    {/* Card 3 */}
                    <div className="bg-white border border-[var(--color-border)] rounded-2xl p-8 flex flex-col items-start shadow-sm">
                        <Activity size={24} color="var(--color-accent)" className="mb-4" />
                        <h3 className="text-[17px] font-semibold text-[var(--color-text-primary)] mb-2">Clinical Intelligence</h3>
                        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                            Powered by pharmacological rule logic and live drug databases. Built for doctors and patients alike.
                        </p>
                    </div>
                </div>

            </div>

            {/* Bottom Bar */}
            <div className="w-full max-w-5xl py-8 mt-auto text-center border-t border-[var(--color-border)] opacity-60">
                <p className="text-xs text-[var(--color-text-muted)]">
                    OpenMed is a clinical decision-support tool. Always consult a qualified healthcare professional.
                </p>
            </div>
        </div>
    );
};

export default LandingPage;
