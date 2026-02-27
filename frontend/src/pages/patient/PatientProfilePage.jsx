import React, { useState, useEffect } from 'react';
import PatientLayout from '../../components/patient/PatientLayout';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import Input from '../../components/shared/Input';
import { patientService } from '../../services/api';
import { Check } from "lucide-react";

const PatientProfilePage = () => {
    const [mode, setMode] = useState("create");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");
    const [formData, setFormData] = useState({
        age: "",
        weight_kg: "",
        egfr: "",
        liver_score: null,
        conditions: "",
        medications: ""
    });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await patientService.getProfile();
                setMode("edit");
                const p = res.data;
                setFormData({
                    age: p.age ?? "",
                    weight_kg: p.weight_kg ?? "",
                    egfr: p.egfr ?? "",
                    liver_score: p.liver_score ?? null,
                    conditions: p.conditions ?? "",
                    medications: p.medications ?? ""
                });
            } catch (err) {
                if (err.response?.status === 404) {
                    setMode("create");
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
        setError("");
        setSaving(true);

        try {
            const payload = {
                age: formData.age ? parseInt(formData.age) : null,
                weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
                egfr: formData.egfr ? parseFloat(formData.egfr) : null,
                liver_score: formData.liver_score || null,
                conditions: formData.conditions || null,
                medications: formData.medications || null
            };

            if (mode === "create") {
                try {
                    await patientService.createProfile(payload);
                    setMode("edit");
                } catch (createErr) {
                    if (createErr.response?.status === 400) {
                        setMode("edit");
                        await patientService.updateProfile(payload);
                    } else {
                        throw createErr;
                    }
                }
            } else {
                await patientService.updateProfile(payload);
            }

            setSuccess(true);
            setTimeout(() => setSuccess(false), 4000);
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to save profile.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <PatientLayout>
                <div className="max-w-[560px] mx-auto px-4 mt-8">
                    <div className="h-12 bg-gray-200 animate-pulse rounded-xl mb-4"></div>
                    <div className="h-12 bg-gray-200 animate-pulse rounded-xl mb-4"></div>
                    <div className="h-12 bg-gray-200 animate-pulse rounded-xl mb-4"></div>
                </div>
            </PatientLayout>
        );
    }

    return (
        <PatientLayout>
            <div className="max-w-[560px] mx-auto px-4">
                <div className="mb-6">
                    <h1 className="text-[24px] font-[700] text-[#1D1D1F] mb-1">
                        {mode === "create" ? "Set Up Your Health Profile" : "Your Health Profile"}
                    </h1>
                    <p className="text-sm text-[#86868B]">This information personalizes your risk scores.</p>
                </div>

                {success && (
                    <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl px-4 py-3 mb-4 flex items-center">
                        <Check className="w-4 h-4 text-[#34C759] shrink-0" />
                        <span className="text-sm text-[#1D1D1F] ml-2">Profile saved successfully. Your risk scores are now personalized.</span>
                    </div>
                )}

                {error && (
                    <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-4 py-3 mb-4">
                        <span className="text-sm text-[#FF3B30]">{error}</span>
                    </div>
                )}

                <Card className="p-6">
                    <form onSubmit={handleSubmit}>

                        {/* Section 1 */}
                        <div className="mb-4">
                            <h2 className="text-base font-[600] text-[#1D1D1F] mb-4">Basic Information</h2>
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
                                    name="weight_kg"
                                    type="number"
                                    placeholder="e.g. 70"
                                    value={formData.weight_kg}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        {/* Section 2 */}
                        <div className="mt-6 mb-2">
                            <h2 className="text-base font-[600] text-[#1D1D1F] mt-6 mb-2">Kidney Function</h2>
                            <p className="text-sm text-[#86868B] mb-4">
                                eGFR measures how well your kidneys filter waste. Your doctor can provide this value. Normal is above 60.
                            </p>
                            <Input
                                label="eGFR Value"
                                name="egfr"
                                type="number"
                                placeholder="e.g. 75"
                                value={formData.egfr}
                                onChange={handleChange}
                            />

                            <div className="mt-4">
                                <div className="text-[10px] uppercase text-[#86868B] mb-1 font-semibold">eGFR Reference Scale</div>
                                <div className="flex w-full h-2 rounded-full overflow-hidden mb-1">
                                    <div className="w-1/5 bg-red-400"></div>
                                    <div className="w-1/5 bg-orange-400"></div>
                                    <div className="w-1/5 bg-yellow-400"></div>
                                    <div className="w-1/5 bg-lime-400"></div>
                                    <div className="w-1/5 bg-green-500"></div>
                                </div>
                                <div className="flex justify-between text-xs text-[#86868B]">
                                    <span>&lt;15</span>
                                    <span>15-29</span>
                                    <span>30-59</span>
                                    <span>60-89</span>
                                    <span>90+</span>
                                </div>
                            </div>
                        </div>

                        {/* Section 3 */}
                        <div className="mt-6 mb-2">
                            <h2 className="text-base font-[600] text-[#1D1D1F] mt-6 mb-2">Liver Function</h2>
                            <p className="text-sm text-[#86868B] mb-4">
                                Select the option that best matches your liver health.
                            </p>

                            {[
                                { score: 1, title: "Normal", sub: "No known liver conditions" },
                                { score: 2, title: "Mild Dysfunction", sub: "Mild elevation in liver enzymes" },
                                { score: 3, title: "Severe Dysfunction", sub: "Cirrhosis or significant impairment" }
                            ].map(opt => {
                                const isSelected = formData.liver_score === opt.score;
                                return (
                                    <div
                                        key={opt.score}
                                        onClick={() => handleSelectLiver(opt.score)}
                                        className={`w-full mb-2 cursor-pointer transition-colors px-4 py-3 rounded-xl border ${isSelected ? 'border-[#0EA5E9] bg-[#F0F9FF]' : 'border-[var(--color-border)] bg-white hover:border-[#AEAEB2]'
                                            }`}
                                    >
                                        <div className={`text-sm font-[600] ${isSelected ? 'text-[#0284C7]' : 'text-[#1D1D1F]'}`}>{opt.title}</div>
                                        <div className={`text-xs ${isSelected ? 'text-[#0369A1]' : 'text-[#86868B]'}`}>{opt.sub}</div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Section 4 */}
                        <div className="mt-6 mb-2">
                            <h2 className="text-base font-[600] text-[#1D1D1F] mt-6 mb-2">Medical Conditions</h2>
                            <div className="mb-2">
                                <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-1.5">
                                    Medical Conditions
                                </label>
                                <textarea
                                    name="conditions"
                                    className="w-full border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] resize-none"
                                    rows="3"
                                    placeholder="e.g. Type 2 Diabetes, Hypertension"
                                    value={formData.conditions}
                                    onChange={handleChange}
                                ></textarea>
                                <p className="mt-1 text-xs text-[#86868B]">Separate multiple conditions with commas</p>
                            </div>
                        </div>

                        <Button type="submit" className="w-full mt-6 h-[44px]" loading={saving} disabled={saving}>
                            {mode === "create" ? "Save Profile" : "Update Profile"}
                        </Button>
                    </form>
                </Card>
            </div>
        </PatientLayout>
    );
};

export default PatientProfilePage;
