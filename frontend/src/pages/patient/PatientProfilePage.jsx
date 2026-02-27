import React, { useState, useEffect } from 'react';
import PatientLayout from '../../components/patient/PatientLayout';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import Input from '../../components/shared/Input';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { patientService } from '../../services/api';

const PatientProfilePage = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [mode, setMode] = useState('create');
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const [formData, setFormData] = useState({
        age: '',
        weight: '',
        egfr: '',
        liver_score: null,
        known_conditions: ''
    });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const profile = await patientService.getProfile();
                setMode('edit');
                setFormData({
                    age: profile.age || '',
                    weight: profile.weight || '',
                    egfr: profile.egfr || '',
                    liver_score: profile.liver_score || null,
                    known_conditions: profile.known_conditions ? profile.known_conditions.join(', ') : ''
                });
            } catch (err) {
                if (err.response?.status === 404) {
                    setMode('create');
                } else {
                    setErrorMsg('Failed to load profile.');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectLiver = (score) => {
        setFormData(prev => ({ ...prev, liver_score: score }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');
        setSaving(true);

        try {
            const payload = { ...formData };
            if (payload.age) payload.age = parseInt(payload.age, 10);
            if (payload.weight) payload.weight = parseFloat(payload.weight);
            if (payload.egfr) payload.egfr = parseFloat(payload.egfr);
            if (payload.known_conditions) {
                payload.known_conditions = payload.known_conditions.split(',').map(c => c.trim()).filter(Boolean);
            } else {
                payload.known_conditions = [];
            }

            if (mode === 'create') {
                await patientService.createProfile(payload);
                setMode('edit');
            } else {
                await patientService.updateProfile(payload);
            }

            setSuccessMsg('✓ Profile saved successfully. Your risk scores are now personalized.');
            setTimeout(() => setSuccessMsg(''), 4000);
        } catch (err) {
            setErrorMsg(err.response?.data?.detail || 'Failed to save profile. Please check the inputs.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <PatientLayout><LoadingSpinner message="Loading profile..." /></PatientLayout>;

    return (
        <PatientLayout>
            <div className="mb-8">
                <h1 className="text-[28px] font-bold text-[var(--color-text-primary)]">
                    {mode === 'create' ? 'Set Up Your Health Profile' : 'Your Health Profile'}
                </h1>
                <p className="text-[var(--color-text-secondary)] mt-1">This information personalizes your risk scores.</p>
            </div>

            {successMsg && (
                <div className="mb-6 bg-[#F4FCE3] border border-[#D8F3AA] text-[#34C759] px-4 py-3 rounded-lg text-sm font-medium animate-in fade-in">
                    {successMsg}
                </div>
            )}

            {errorMsg && (
                <div className="mb-6 bg-[#FFF0F0] border border-[#FFD8D8] text-[#FF3B30] px-4 py-3 rounded-lg text-sm font-medium">
                    {errorMsg}
                </div>
            )}

            <Card className="p-8 max-w-[560px] mx-auto">
                <form onSubmit={handleSubmit}>

                    {/* Basic Info */}
                    <div className="mb-8">
                        <h2 className="text-base font-semibold text-[#1D1D1F] mb-4">Basic Information</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Age"
                                name="age"
                                type="number"
                                placeholder="Your age in years"
                                value={formData.age}
                                onChange={handleChange}
                            />
                            <Input
                                label="Weight (kg)"
                                name="weight"
                                type="number"
                                placeholder="e.g. 70"
                                value={formData.weight}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    {/* Kidney Function */}
                    <div className="mb-8">
                        <h2 className="text-base font-semibold text-[#1D1D1F] mb-2">Kidney Function</h2>
                        <p className="text-sm text-[#86868B] mb-4 leading-relaxed">
                            eGFR (estimated Glomerular Filtration Rate) measures how well your kidneys filter waste. Your doctor can provide this value.
                        </p>
                        <Input
                            label="eGFR Value"
                            name="egfr"
                            type="number"
                            placeholder="e.g. 75"
                            value={formData.egfr}
                            onChange={handleChange}
                        />

                        {/* eGFR Scale visual */}
                        <div className="mt-4">
                            <p className="text-[10px] uppercase tracking-wider text-[#86868B] font-semibold mb-1">eGFR Reference Scale</p>
                            <div className="flex h-2 w-full rounded-full overflow-hidden">
                                <div className="bg-[#FF3B30] w-[15%]"></div>
                                <div className="bg-[#FF9500] w-[15%]"></div>
                                <div className="bg-[#FFCC00] w-[30%]"></div>
                                <div className="bg-[#A4E36A] w-[30%]"></div>
                                <div className="bg-[#34C759] w-[10%]"></div>
                            </div>
                            <div className="flex justify-between mt-1 text-[10px] text-[#A1A1A6]">
                                <span className="w-[15%] text-left pl-1">Fail</span>
                                <span className="w-[15%] text-left">Severe</span>
                                <span className="w-[30%] text-center">Moderate</span>
                                <span className="w-[30%] text-center">Mild</span>
                                <span className="w-[10%] text-right pr-1">Normal</span>
                            </div>
                        </div>
                    </div>

                    {/* Liver Function */}
                    <div className="mb-8">
                        <h2 className="text-base font-semibold text-[#1D1D1F] mb-2">Liver Function</h2>
                        <p className="text-sm text-[#86868B] mb-4 leading-relaxed">
                            Select the option that best describes your liver health based on your doctor's assessment.
                        </p>

                        <div className="space-y-2">
                            {[
                                { score: 1, label: 'Normal', sub: 'No known liver conditions' },
                                { score: 2, label: 'Mild Dysfunction', sub: 'Mild elevation in liver enzymes' },
                                { score: 3, label: 'Severe Dysfunction', sub: 'Cirrhosis or significant impairment' }
                            ].map(opt => {
                                const isSelected = formData.liver_score === opt.score;
                                return (
                                    <div
                                        key={opt.score}
                                        onClick={() => handleSelectLiver(opt.score)}
                                        className={`border rounded-xl px-4 py-3 cursor-pointer transition-colors ${isSelected
                                                ? 'border-[#0EA5E9] bg-[#F0F9FF]'
                                                : 'border-[#EBEBED] hover:border-[#AEAEB2] bg-white'
                                            }`}
                                    >
                                        <h4 className={`text-sm font-semibold ${isSelected ? 'text-[#0284C7]' : 'text-[#1D1D1F]'}`}>{opt.label}</h4>
                                        <p className={`text-xs mt-0.5 ${isSelected ? 'text-[#0369A1]' : 'text-[#86868B]'}`}>{opt.sub}</p>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Conditions */}
                    <div className="mb-8">
                        <h2 className="text-base font-semibold text-[#1D1D1F] mb-2">Current Conditions</h2>
                        <div>
                            <label className="block text-sm font-semibold text-[#1D1D1F] mb-1.5">Medical Conditions</label>
                            <textarea
                                name="known_conditions"
                                className="w-full px-4 py-2.5 bg-[#F5F5F7] border border-[#EBEBED] rounded-lg text-sm text-[var(--color-text-primary)] placeholder-[#A1A1A6] focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] focus:bg-white transition-all resize-y"
                                rows="3"
                                placeholder="e.g. Type 2 Diabetes, Hypertension, Heart Disease"
                                value={formData.known_conditions}
                                onChange={handleChange}
                            ></textarea>
                            <p className="mt-1.5 text-xs text-[#86868B]">Separate multiple conditions with commas</p>
                        </div>
                    </div>

                    <div className="pt-2 border-t border-[#EBEBED]">
                        <Button
                            type="submit"
                            className="w-full h-[44px]"
                            loading={saving}
                        >
                            {mode === 'create' ? 'Save Profile' : 'Update Profile'}
                        </Button>
                    </div>

                </form>
            </Card>
        </PatientLayout>
    );
};

export default PatientProfilePage;
