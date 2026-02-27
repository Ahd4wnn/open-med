import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DoctorLayout from '../../components/doctor/DoctorLayout';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import Input from '../../components/shared/Input';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import { patientService } from '../../services/api';

const PatientsPage = () => {
    const navigate = useNavigate();
    const [patients, setPatients] = useState([]);
    const [filteredPatients, setFilteredPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchPatients = async () => {
            try {
                const data = await patientService.getAllPatients();
                setPatients(data);
                setFilteredPatients(data);
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
                (p.user?.full_name || '').toLowerCase().includes(lowerQuery) ||
                (p.user?.email || '').toLowerCase().includes(lowerQuery)
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
                <div className="text-sm text-[#86868B]">
                    {filteredPatients.length} {filteredPatients.length === 1 ? 'patient' : 'patients'}
                </div>
            </div>

            {filteredPatients.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-[#EBEBED] rounded-2xl">
                    <svg className="text-[#D1D1D6] mb-4" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    <h3 className="text-lg font-semibold text-[#1D1D1F]">No patients found</h3>
                    <p className="text-[#86868B] mt-2">Patients will appear here after they create profiles.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredPatients.map((patient) => {
                        const medCount = patient.current_medications?.length || 0;
                        const age = patient.age || '—';
                        const egfr = patient.egfr || '—';

                        return (
                            <Card key={patient.id} className="p-5 flex flex-col">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-[#F5F5F7] border border-[#EBEBED] flex items-center justify-center text-sm font-semibold text-[#515154]">
                                        {getInitials(patient.user?.full_name)}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-sm text-[#1D1D1F]">{patient.user?.full_name || 'Unknown Patient'}</h3>
                                        <p className="text-xs text-[#86868B]">{patient.user?.email || 'No email'}</p>
                                    </div>
                                </div>

                                <div className="border-b border-[#EBEBED] my-4"></div>

                                <div className="grid grid-cols-3 gap-2 text-center mb-4">
                                    <div>
                                        <div className="font-semibold text-sm text-[#1D1D1F]">{age}</div>
                                        <div className="text-[10px] uppercase tracking-wider text-[#86868B] mt-0.5">Age</div>
                                    </div>
                                    <div>
                                        <div className="font-semibold text-sm text-[#1D1D1F]">{egfr}</div>
                                        <div className="text-[10px] uppercase tracking-wider text-[#86868B] mt-0.5">eGFR</div>
                                    </div>
                                    <div>
                                        <div className="font-semibold text-sm text-[#1D1D1F]">{medCount}</div>
                                        <div className="text-[10px] uppercase tracking-wider text-[#86868B] mt-0.5">Medications</div>
                                    </div>
                                </div>

                                <div className="mt-auto flex items-end justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-[#86868B] truncate" title={patient.known_conditions?.join(', ') || 'No conditions listed'}>
                                            {patient.known_conditions?.length ? patient.known_conditions.join(', ') : 'No conditions listed'}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="shrink-0"
                                        onClick={() => navigate(`/doctor/analyzer`)} // Note: Analyzer expects selectedDrugs usually, but they can enter the ID manually for now.
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
