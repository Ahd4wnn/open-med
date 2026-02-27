import React, { useState, useEffect, useRef } from 'react';
import Badge from './Badge';
import { Search } from 'lucide-react';

const SearchIcon = () => <Search size={16} />;

const PatientSelector = ({ selectedPatient, onSelectPatient }) => {
    const [patients, setPatients] = useState([]);
    const [patientsLoading, setPatientsLoading] = useState(true);
    const [patientSearchQuery, setPatientSearchQuery] = useState("");
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);

    // We can use a ref to handle closing when clicking outside, or just onBlur
    const wrapperRef = useRef(null);

    useEffect(() => {
        fetchPatients();
    }, []);

    const fetchPatients = async () => {
        setPatientsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:8000/api/patient/all', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setPatients(data);
            }
        } catch (err) {
            console.error("Failed to fetch patients", err);
        } finally {
            setPatientsLoading(false);
        }
    };

    const getInitials = (name) => {
        if (!name) return "?";
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const handleSelectPatient = (patient) => {
        onSelectPatient(patient);
        setPatientSearchQuery("");
        setIsDropdownVisible(false);
    };

    const filteredPatients = patients.filter(p => {
        const name = p.full_name || p.email || "";
        return name.toLowerCase().includes(patientSearchQuery.toLowerCase());
    });

    return (
        <div ref={wrapperRef}>
            {!selectedPatient ? (
                <div className="relative">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[#86868B]">
                            <SearchIcon />
                        </div>
                        <input
                            type="text"
                            className="w-full pl-10 pr-4 py-3 bg-white border border-[#EBEBED] rounded-lg text-sm focus:ring-2 focus:ring-[#0EA5E9] transition-all outline-none"
                            placeholder="Search by name..."
                            value={patientSearchQuery}
                            onChange={(e) => {
                                setPatientSearchQuery(e.target.value);
                                setIsDropdownVisible(true);
                            }}
                            onFocus={() => setIsDropdownVisible(true)}
                            onBlur={() => setTimeout(() => setIsDropdownVisible(false), 200)}
                        />
                    </div>

                    {(isDropdownVisible || patientSearchQuery) && (
                        <div className="absolute top-full left-0 right-0 mt-1 max-h-[280px] overflow-y-auto border border-[#EBEBED] rounded-xl bg-white shadow-lg z-50">
                            {patientsLoading ? (
                                <div className="p-4 space-y-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex items-center gap-3 animate-pulse">
                                            <div className="w-9 h-9 bg-gray-200 rounded-full"></div>
                                            <div className="flex-1 space-y-2">
                                                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                                                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : filteredPatients.length === 0 ? (
                                <p className="text-sm text-[#86868B] p-4">No patients found.</p>
                            ) : (
                                filteredPatients.map((p, idx) => (
                                    <div
                                        key={`patient-${p.id || idx}`}
                                        className="flex items-center px-4 py-3 hover:bg-[#F5F5F7] cursor-pointer border-b border-[#EBEBED] last:border-0"
                                        onMouseDown={(e) => {
                                            // onMouseDown instead of onClick to fire before onBlur of input
                                            e.preventDefault();
                                            handleSelectPatient(p);
                                        }}
                                    >
                                        <div className="w-9 h-9 bg-[#F5F5F7] border border-[#EBEBED] rounded-full flex items-center justify-center text-xs font-semibold text-[#1D1D1F] flex-shrink-0">
                                            {getInitials(p.full_name)}
                                        </div>
                                        <div className="ml-3 flex-1 flex items-center justify-between">
                                            <div>
                                                <div className="flex items-center">
                                                    <span className="text-sm font-semibold text-[#1D1D1F]">{p.full_name || 'Unknown Patient'}</span>
                                                    {!p.has_profile && <span className="ml-2 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">No Profile</span>}
                                                </div>
                                                <div className="flex gap-3 mt-0.5">
                                                    <span className={p.age ? "text-xs text-[#515154]" : "text-xs text-[#86868B]"}>
                                                        Age {p.age ? p.age : '—'}
                                                    </span>
                                                    <span className={p.weight_kg ? "text-xs text-[#515154]" : "text-xs text-[#86868B]"}>
                                                        {p.weight_kg ? `${p.weight_kg} kg` : 'Weight —'}
                                                    </span>
                                                </div>
                                            </div>
                                            {p.latest_risk_category && (
                                                <Badge category={p.latest_risk_category} />
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-[#F5F5F7] border border-[#EBEBED] rounded-xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center">
                        <div className="w-10 h-10 bg-white border border-[#EBEBED] rounded-full flex items-center justify-center text-sm font-semibold text-[#1D1D1F] flex-shrink-0">
                            {getInitials(selectedPatient.full_name)}
                        </div>
                        <div className="ml-3">
                            <div className="text-sm font-semibold text-[#1D1D1F]">{selectedPatient.full_name || 'Unknown Patient'}</div>
                            <div className="mt-0.5 flex items-center text-xs text-[#515154]">
                                <span>Age: {selectedPatient.age || '—'}</span>
                                <span className="mx-1.5 text-[#86868B]">·</span>
                                <span>{selectedPatient.weight_kg || '—'} kg</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            onSelectPatient(null);
                        }}
                        className="text-xs font-semibold text-[#0EA5E9] hover:text-[#0284C7] bg-[#E0F2FE] hover:bg-[#BAE6FD] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                        Change
                    </button>
                </div>
            )}
        </div>
    );
};

export default PatientSelector;
