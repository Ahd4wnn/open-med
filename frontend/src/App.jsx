import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'

function App() {
    return (
        <AuthProvider>
            <Routes>
                <Route path="/" element={<div>LandingPage</div>} />
                <Route path="/login" element={<div>LoginPage</div>} />
                <Route path="/register" element={<div>RegisterPage</div>} />
                <Route path="/doctor/dashboard" element={<div>DoctorDashboard</div>} />
                <Route path="/patient/dashboard" element={<div>PatientDashboard</div>} />
            </Routes>
        </AuthProvider>
    )
}

export default App
