import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, FlaskConical, Activity, Users, Clock, Leaf, LogOut } from "lucide-react";
import Button from '../shared/Button';
const DoctorLayout = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleSignOut = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { path: '/doctor/dashboard', label: 'Overview', icon: <LayoutDashboard size={18} /> },
        { path: '/doctor/analyzer', label: 'Drug Analyzer', icon: <FlaskConical size={18} /> },
        { path: '/doctor/pk-simulation', label: 'PK Simulation', icon: <Activity size={18} /> },
        { path: '/doctor/lifestyle', label: 'Lifestyle Analysis', icon: <Leaf size={18} /> },
        { path: '/doctor/patients', label: 'Patients', icon: <Users size={18} /> },
        { path: '/doctor/history', label: 'History', icon: <Clock size={18} /> },
    ];

    const getPageTitle = () => {
        const currentItem = navItems.find(item => location.pathname === item.path);
        return currentItem ? currentItem.label : 'Dashboard';
    };

    const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div className="flex h-screen bg-[#FAFAFA]">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 bottom-0 w-[240px] bg-white border-r border-[#EBEBED] flex flex-col z-10">
                <div className="p-6">
                    <h1 className="text-lg font-bold text-[#1D1D1F] tracking-tight">OpenMed</h1>
                    <p className="text-xs text-[#86868B] mt-1">Clinical Dashboard</p>
                </div>

                <nav className="flex-1 px-4 mt-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                    ? 'bg-[#F5F5F7] text-[#1D1D1F] border-l-2 border-[#0EA5E9]'
                                    : 'text-[#86868B] hover:bg-[#F5F5F7]'
                                    }`}
                            >
                                {item.icon}
                                {item.label}
                            </NavLink>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-[#EBEBED]">
                    <div className="px-3 py-2">
                        <p className="text-sm font-semibold text-[#1D1D1F]">{user?.full_name || 'Doctor'}</p>
                        <p className="text-xs text-[#86868B] truncate">{user?.email}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="w-full justify-start mt-2" onClick={handleSignOut}>
                        <LogOut size={16} className="mr-2" /> Sign Out
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="ml-[240px] flex-1 flex flex-col h-screen overflow-y-auto">
                <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-[#EBEBED] px-8 py-4 flex items-center justify-between z-10">
                    <h2 className="text-lg font-semibold text-[#1D1D1F]">{getPageTitle()}</h2>
                    <span className="text-sm text-[#86868B]">{currentDate}</span>
                </header>

                <div className="px-8 py-6 max-w-7xl mx-auto w-full">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default DoctorLayout;
