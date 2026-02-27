import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DoctorLayout from '../../components/doctor/DoctorLayout';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import Input from '../../components/shared/Input';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { patientService } from '../../services/api';
import { Users } from "lucide-react";

const PatientsPage = () => {
    const navigate = useNavigate();
    const [patients, setPatients] = useState([]);
    const [filteredPatients, setFilteredPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchPatients = async () => {
            try {
                const res = await patientService.getAllPatients();
                setPatients(res.data);
                setFilteredPatients(res.data);
            } catch (err) {
                console.error("Failed to load patients", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPatients();
    }, []);

    useEffect(() => {
        if (!searchQuery) {
            setFilteredPatients(patients);
        } else {
            const lowerQuery = searchQuery.toLowerCase();
            const filtered = patients.filter(p =>
                (p.full_name || '').toLowerCase().includes(lowerQuery) ||
                (p.email || '').toLowerCase().includes(lowerQuery)
            );
            setFilteredPatients(filtered);
        }
    }, [searchQuery, patients]);

    const getInitials = (name) => {
        if (!name) return '??';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    if (loading) return <DoctorLayout><LoadingSpinner message="Loading patients..." /></DoctorLayout>;

    return (
        <DoctorLayout>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="w-full max-w-md">
                    <Input
                        placeholder="Search patients by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="text-sm font-medium text-[#86868B]">
                    {filteredPatients.length} {filteredPatients.length === 1 ? 'patient' : 'patients'}
                </div>
            </div>

            {filteredPatients.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-[#EBEBED] rounded-2xl">
                    <Users size={48} color="#D1D1D6" className="mb-4" />
                    <h3 className="text-lg font-semibold text-[#1D1D1F]">No patients registered yet.</h3>
                    <p className="text-[#86868B] mt-2 text-sm">Patients will appear here once they register.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                    {filteredPatients.map((patient) => {
                        const medCount = patient.medication_count || '—';
                        const age = patient.age || '—';
                        const egfr = patient.egfr || '—';

                        const dateFormatted = patient.created_at ? new Date(patient.created_at).toLocaleDateString() : '';

                        return (
                            <Card key={patient.user_id} className="p-5 flex flex-col h-full shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-[#F5F5F7] border border-[#EBEBED] flex items-center justify-center text-sm font-bold text-[#515154]">
                                            {getInitials(patient.full_name)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-base text-[#1D1D1F]">{patient.full_name || 'Unknown Patient'}</h3>
                                                {!patient.has_profile && (
                                                    <span className="px-2 py-0.5 rounded-full bg-[#F5F5F7] text-[#86868B] text-[10px] font-semibold uppercase tracking-wider">No Profile</span>
                                                )}
                                            </div>
                                            <p className="text-sm text-[#86868B]">{patient.email || 'No email'}</p>
                                        </div>
                                    </div>
                                    <div className="text-xs text-[#AEAEB2] whitespace-nowrap">
                                        Registered {dateFormatted}
                                    </div>
                                </div>

                                <div className="border-b border-[#EBEBED] my-5"></div>

                                <div className="grid grid-cols-3 gap-2 text-center mb-5">
                                    <div className="bg-[#F5F5F7] rounded-lg p-2">
                                        <div className="font-bold text-sm text-[#1D1D1F]">{age}</div>
                                        <div className="text-[10px] uppercase tracking-wider text-[#86868B] mt-1">Age</div>
                                    </div>
                                    <div className="bg-[#F5F5F7] rounded-lg p-2">
                                        <div className="font-bold text-sm text-[#1D1D1F]">{egfr}</div>
                                        <div className="text-[10px] uppercase tracking-wider text-[#86868B] mt-1">eGFR</div>
                                    </div>
                                    <div className="bg-[#F5F5F7] rounded-lg p-2">
                                        <div className="font-bold text-sm text-[#1D1D1F]">{medCount}</div>
                                        <div className="text-[10px] uppercase tracking-wider text-[#86868B] mt-1">Meds</div>
                                    </div>
                                </div>

                                <div className="mt-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
                                    <div className="flex-1 min-w-0">
                                        {patient.latest_risk_category ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-[#86868B]">Latest risk:</span>
                                                <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${patient.latest_risk_category === 'Severe' ? 'bg-red-100 text-red-800' :
                                                    patient.latest_risk_category === 'Moderate' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-green-100 text-green-800'
                                                    }`}>
                                                    {patient.latest_risk_category}
                                                </span>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-[#86868B] italic">No assessment yet</p>
                                        )}
                                    </div>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        className="w-full sm:w-auto shrink-0"
                                        onClick={() => navigate("/doctor/analyzer", {
                                            state: {
                                                preselectedPatient: {
                                                    profile_id: patient.profile_id,
                                                    user_id: patient.user_id,
                                                    full_name: patient.full_name,
                                                    age: patient.age,
                                                    weight_kg: patient.weight_kg,
                                                    egfr: patient.egfr,
                                                    liver_score: patient.liver_score,
                                                    conditions: patient.conditions,
                                                    medications: patient.medications,
                                                    latest_risk_category: patient.latest_risk_category,
                                                    latest_risk_score: patient.latest_risk_score
                                                }
                                            }
                                        })}
                                    >
                                        Analyze
                                    </Button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </DoctorLayout>
    );
};

export default PatientsPage;
