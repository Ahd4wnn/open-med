import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/shared/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import DrugAnalyzer from './pages/doctor/DrugAnalyzer';
import PatientsPage from './pages/doctor/PatientsPage';
import HistoryPage from './pages/doctor/HistoryPage';
import PatientDashboard from './pages/patient/PatientDashboard';
import MedicationsPage from './pages/patient/MedicationsPage';
import PatientHistoryPage from './pages/patient/PatientHistoryPage';
import PatientProfilePage from './pages/patient/PatientProfilePage';
import PKSimulationPage from './pages/doctor/PKSimulationPage';

function App() {
    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected Routes */}
            <Route
                path="/doctor/dashboard"
                element={
                    <ProtectedRoute allowedRoles={["doctor"]}>
                        <DoctorDashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/doctor/analyzer"
                element={
                    <ProtectedRoute allowedRoles={["doctor"]}>
                        <DrugAnalyzer />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/doctor/patients"
                element={
                    <ProtectedRoute allowedRoles={["doctor"]}>
                        <PatientsPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/doctor/pk-simulation"
                element={
                    <ProtectedRoute allowedRoles={["doctor"]}>
                        <PKSimulationPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/doctor/history"
                element={
                    <ProtectedRoute allowedRoles={["doctor"]}>
                        <HistoryPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/patient/dashboard"
                element={
                    <ProtectedRoute allowedRoles={["patient"]}>
                        <PatientDashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/patient/medications"
                element={
                    <ProtectedRoute allowedRoles={["patient"]}>
                        <MedicationsPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/patient/history"
                element={
                    <ProtectedRoute allowedRoles={["patient"]}>
                        <PatientHistoryPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/patient/profile"
                element={
                    <ProtectedRoute allowedRoles={["patient"]}>
                        <PatientProfilePage />
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
}

export default App;
