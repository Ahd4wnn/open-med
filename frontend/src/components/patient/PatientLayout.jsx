import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Home, Pill, Leaf, Clock, User, LogOut } from "lucide-react";
import Button from '../shared/Button';

const PatientLayout = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleSignOut = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { path: '/patient/dashboard', label: 'Home', icon: <Home size={18} /> },
        { path: '/patient/medications', label: 'My Medications', icon: <Pill size={18} /> },
        { path: '/patient/lifestyle', label: 'My Lifestyle', icon: <Leaf size={18} /> },
        { path: '/patient/history', label: 'Risk History', icon: <Clock size={18} /> },
        { path: '/patient/profile', label: 'My Profile', icon: <User size={18} /> },
    ];

    const firstName = user?.full_name ? user.full_name.split(' ')[0] : 'Patient';

    return (
        <div className="min-h-screen bg-[#FAFAFA]">
            {/* Top Navigation Bar */}
            <header className="fixed top-0 left-0 right-0 h-[56px] bg-white border-b border-[var(--color-border)] z-[100] flex items-center justify-between px-6">
                <div className="flex items-center gap-2">
                    <span className="text-[#0EA5E9]"><Pill size={18} color="var(--color-accent)" /></span>
                    <span className="text-lg font-bold text-[var(--color-text-primary)] tracking-tight">OpenMed</span>
                </div>

                <nav className="hidden md:flex items-center gap-1">
                    {navItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `
                                flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
                                ${isActive ? 'bg-[var(--color-surface)] text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]'}
                            `}
                        >
                            {item.icon}
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-[var(--color-text-primary)] hidden sm:inline-block">
                        Hi, {firstName}
                    </span>
                    <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-sm font-medium">
                        <LogOut size={16} className="mr-2" /> Sign Out
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
                                flex flex-col items-center gap-1 p-2 text-xs font-medium text-center
                                ${isActive ? 'text-[#0EA5E9]' : 'text-[#86868B]'}
                            `}
                    >
                        {item.icon}
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
