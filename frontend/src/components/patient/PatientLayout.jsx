import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../shared/Button';

const PillIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.5 20.5 7 24l-3-3L.5 17.5M10.5 20.5l4-4L11 13l-4 4-3.5 3.5M10.5 20.5l3.5-3.5"></path><path d="M14.5 16.5l3.5-3.5L14 9l-3.5 3.5"></path><path d="M18 13l3.5-3.5a3.536 3.536 0 0 0-5-5L13 8l5 5z"></path>
    </svg>
);

const PatientLayout = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleSignOut = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { path: '/patient/dashboard', label: 'Home' },
        { path: '/patient/medications', label: 'My Medications' },
        { path: '/patient/history', label: 'Risk History' },
        { path: '/patient/profile', label: 'My Profile' },
    ];

    const firstName = user?.full_name ? user.full_name.split(' ')[0] : 'Patient';

    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            {/* Top Navigation Bar */}
            <header className="fixed top-0 left-0 right-0 h-[56px] bg-white border-b border-[var(--color-border)] z-[100] flex items-center justify-between px-6">
                <div className="flex items-center gap-2">
                    <span className="text-[#0EA5E9]"><PillIcon /></span>
                    <span className="text-lg font-bold text-[var(--color-text-primary)] tracking-tight">OpenMed</span>
                </div>

                <nav className="hidden md:flex items-center gap-1">
                    {navItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `
                                px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
                                ${isActive ? 'bg-[var(--color-surface)] text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]'}
                            `}
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-[var(--color-text-primary)] hidden sm:inline-block">
                        Hi, {firstName}
                    </span>
                    <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-sm font-medium">
                        Sign Out
                    </Button>
                </div>
            </header>

            {/* Mobile Nav Drawer (Optional, keeping it simple for now) */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--color-border)] flex justify-between px-4 py-2 z-[100]">
                {navItems.map(item => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `
                                p-2 text-xs font-medium text-center
                                ${isActive ? 'text-[#0EA5E9]' : 'text-[#86868B]'}
                            `}
                    >
                        {item.label.split(' ')[0]} {/* Abbreviated for mobile bottom bar */}
                    </NavLink>
                ))}
            </div>

            {/* Main Content Area */}
            <main className="pt-[56px] pb-[80px] md:pb-0 mx-auto max-w-[900px] px-6 py-8">
                {children}
            </main>
        </div>
    );
};

export default PatientLayout;
