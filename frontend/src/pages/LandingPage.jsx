import React from 'react';
import { useNavigate } from 'react-router-dom';
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
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--color-accent)] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                        <h3 className="text-[17px] font-semibold text-[var(--color-text-primary)] mb-2">Multi-Drug Analysis</h3>
                        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                            Analyze up to 20 medications simultaneously. Detect interactions across every drug pair with severity classification.
                        </p>
                    </div>

                    {/* Card 2 */}
                    <div className="bg-white border border-[var(--color-border)] rounded-2xl p-8 flex flex-col items-start shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--color-accent)] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <h3 className="text-[17px] font-semibold text-[var(--color-text-primary)] mb-2">Personalized Risk Score</h3>
                        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                            Risk scores adjusted for age, kidney function, liver health, and polypharmacy load. Fully explainable breakdowns.
                        </p>
                    </div>

                    {/* Card 3 */}
                    <div className="bg-white border border-[var(--color-border)] rounded-2xl p-8 flex flex-col items-start shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[var(--color-accent)] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                        </svg>
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
