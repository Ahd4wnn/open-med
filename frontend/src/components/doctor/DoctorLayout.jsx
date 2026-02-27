import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../shared/Button';

// Quick inline SVG icons for sidebar
const GridIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>
    </svg>
);

const PillIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.5 20.5 7 24l-3-3L.5 17.5M10.5 20.5l4-4L11 13l-4 4-3.5 3.5M10.5 20.5l3.5-3.5"></path><path d="M14.5 16.5l3.5-3.5L14 9l-3.5 3.5"></path><path d="M18 13l3.5-3.5a3.536 3.536 0 0 0-5-5L13 8l5 5z"></path>
    </svg>
);

const UsersIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
);

const ClockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
    </svg>
);

const ActivityIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
);

const DoctorLayout = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleSignOut = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { path: '/doctor/dashboard', label: 'Overview', icon: <GridIcon /> },
        { path: '/doctor/analyzer', label: 'Drug Analyzer', icon: <PillIcon /> },
        { path: '/doctor/pk-simulation', label: 'PK Simulation', icon: <ActivityIcon /> },
        { path: '/doctor/patients', label: 'Patients', icon: <UsersIcon /> },
        { path: '/doctor/history', label: 'History', icon: <ClockIcon /> },
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
                        Sign Out
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
