import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import Card from '../components/shared/Card';
import Input from '../components/shared/Input';
import Button from '../components/shared/Button';

const LoginPage = () => {
    const [selectedRole, setSelectedRole] = useState('patient');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await authService.login(email, password);
            // Wait for auth to set token, but check role internally here too to confirm match
            // A backend limitation right now is that standard auth doesn't prevent a "patient" from logging in
            // and getting a token if they clicked "doctor". We will just route based on what they *actually* are.
            login(data.user, data.access_token);

            const userRole = data.user.role;
            if (userRole !== selectedRole) {
                // Just an informational warning to the user, they clicked the wrong tab but are still logged in
                console.warn(`User clicked ${selectedRole} but is actually a ${userRole}`);
            }

            if (userRole === 'doctor') {
                navigate('/doctor/dashboard');
            } else {
                navigate('/patient/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to sign in. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4">
            <Card className="w-full max-w-[420px] p-8 flex flex-col items-center">

                <div className="text-center mb-8 w-full">
                    <h2 className="text-[18px] font-bold text-[var(--color-text-primary)] tracking-tight mb-2">OpenMed</h2>
                    <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">Welcome back</h1>
                    <p className="text-sm text-[var(--color-text-secondary)]">Sign in to your account</p>
                </div>

                {/* Role Toggle */}
                <div className="w-full bg-[var(--color-surface)] p-1 rounded-full flex items-center justify-between mb-6">
                    <button
                        type="button"
                        onClick={() => setSelectedRole('patient')}
                        className={`flex-1 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ${selectedRole === 'patient'
                                ? 'bg-[var(--color-accent)] text-white shadow-sm'
                                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                            }`}
                    >
                        Patient
                    </button>
                    <button
                        type="button"
                        onClick={() => setSelectedRole('doctor')}
                        className={`flex-1 py-1.5 text-sm font-medium rounded-full transition-all duration-200 ${selectedRole === 'doctor'
                                ? 'bg-[var(--color-accent)] text-white shadow-sm'
                                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                            }`}
                    >
                        Doctor
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
                    <Input
                        label="Email Address"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading}
                    />

                    <div className="w-full flex flex-col items-end">
                        <Input
                            label="Password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                        />
                        <button type="button" className="text-xs text-[var(--color-accent)] font-medium mt-1.5 hover:underline">
                            Forgot password?
                        </button>
                    </div>

                    <div className="w-full pt-2">
                        <Button type="submit" className="w-full" loading={loading}>
                            Sign In
                        </Button>
                    </div>

                    {error && (
                        <div className="w-full p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg mt-2">
                            <p className="text-xs text-[#DC2626] font-medium text-center">{error}</p>
                        </div>
                    )}
                </form>

                <div className="w-full text-center mt-6 pt-6 border-t border-[var(--color-border)]">
                    <p className="text-sm text-[var(--color-text-secondary)]">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-[var(--color-accent)] font-medium hover:underline">
                            Register
                        </Link>
                    </p>
                </div>

            </Card>
        </div>
    );
};

export default LoginPage;
