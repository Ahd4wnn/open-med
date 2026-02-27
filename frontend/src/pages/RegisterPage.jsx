import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';
import Card from '../components/shared/Card';
import Input from '../components/shared/Input';
import Button from '../components/shared/Button';

const RegisterPage = () => {
    const [selectedRole, setSelectedRole] = useState('patient');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState('');

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setPasswordError('');
        setServerError('');

        if (password !== confirmPassword) {
            setPasswordError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setPasswordError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            const data = await authService.register(email, password, fullName, selectedRole);
            login(data.user, data.access_token);

            if (data.user.role === 'doctor') {
                navigate('/doctor/dashboard');
            } else {
                navigate('/patient/dashboard');
            }
        } catch (err) {
            setServerError(err.response?.data?.detail || 'Failed to create account. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4 py-12">
            <Card className="w-full max-w-[420px] p-8 flex flex-col items-center">

                <div className="text-center mb-8 w-full">
                    <h2 className="text-[18px] font-bold text-[var(--color-text-primary)] tracking-tight mb-2">OpenMed</h2>
                    <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">Create account</h1>
                    <p className="text-sm text-[var(--color-text-secondary)]">Join OpenMed to analyze medications</p>
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
                        label="Full Name"
                        type="text"
                        placeholder="John Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        disabled={loading}
                    />

                    <Input
                        label="Email Address"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading}
                    />

                    <Input
                        label="Password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            setPasswordError('');
                        }}
                        hint="Minimum 6 characters"
                        required
                        disabled={loading}
                    />

                    <Input
                        label="Confirm Password"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            setPasswordError('');
                        }}
                        error={passwordError}
                        required
                        disabled={loading}
                    />

                    <div className="w-full pt-2">
                        <Button type="submit" className="w-full" loading={loading}>
                            Create Account
                        </Button>
                    </div>

                    {serverError && (
                        <div className="w-full p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg mt-2">
                            <p className="text-xs text-[#DC2626] font-medium text-center">{serverError}</p>
                        </div>
                    )}
                </form>

                <div className="w-full text-center mt-6 pt-6 border-t border-[var(--color-border)]">
                    <p className="text-sm text-[var(--color-text-secondary)]">
                        Already have an account?{' '}
                        <Link to="/login" className="text-[var(--color-accent)] font-medium hover:underline">
                            Sign In
                        </Link>
                    </p>
                </div>

            </Card>
        </div>
    );
};

export default RegisterPage;
