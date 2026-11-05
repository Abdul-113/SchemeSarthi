import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    HomeIcon, DocumentChartBarIcon as DocumentHeaderIcon,
    ChatBubbleLeftIcon as ChatIcon, DocumentCheckIcon,
    UserCircleIcon, InformationCircleIcon,
    ShieldExclamationIcon as RiskIcon, SparklesIcon,
    ArrowRightStartOnRectangleIcon
} from '@heroicons/react/24/outline';
import {
    HomeIcon as HomeSolid, DocumentChartBarIcon as DocSolid,
    ChatBubbleLeftIcon as ChatSolid, DocumentCheckIcon as DocCheckSolid,
    UserCircleIcon as UserCircleSolid, InformationCircleIcon as InfoSolid,
    ShieldExclamationIcon as RiskSolid, SparklesIcon as SparklesSolid
} from '@heroicons/react/24/solid';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/userStore';

const Layout = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const path = location.pathname;
    const { t, i18n } = useTranslation();
    const { user, signOut } = useAuthStore();

    const changeLanguage = (lng) => i18n.changeLanguage(lng);

    const handleSignOut = async () => {
        await signOut();
        navigate('/auth');
    };

    const navItems = [
        { name: t('home'), path: '/', icon: HomeIcon, activeIcon: HomeSolid },
        { name: t('chat'), path: '/chat', icon: ChatIcon, activeIcon: ChatSolid },
        { name: t('eligibility'), path: '/eligibility', icon: DocumentHeaderIcon, activeIcon: DocSolid },

        { name: t('documents', { defaultValue: 'Vault' }), path: '/documents', icon: DocumentCheckIcon, activeIcon: DocCheckSolid },
        { name: t('autofill', { defaultValue: 'Auto-Fill' }), path: '/autofill', icon: SparklesIcon, activeIcon: SparklesSolid },
        { name: t('profile'), path: '/profile', icon: UserCircleIcon, activeIcon: UserCircleSolid },
        { name: t('about'), path: '/about', icon: InformationCircleIcon, activeIcon: InfoSolid },
    ];

    // Avatar: first letter of email or displayName
    const avatarLetter = user?.user_metadata?.full_name?.[0]?.toUpperCase()
        || user?.user_metadata?.name?.[0]?.toUpperCase()
        || user?.email?.[0]?.toUpperCase()
        || '?';
    const displayName = user?.user_metadata?.full_name
        || user?.user_metadata?.name
        || user?.email?.split('@')[0]
        || 'User';

    return (
        <div className="min-h-screen flex flex-col relative pb-24 md:pb-0">
            {/* Desktop Nav */}
            <header className="hidden md:flex fixed top-0 w-full z-50 bg-white/80 backdrop-blur-2xl border-b border-gray-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.02)] transition-all duration-300">
                <div className="max-w-7xl w-full mx-auto px-6 h-16 flex items-center justify-between">
                    {/* Left: Branding */}
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center text-white font-black text-lg shadow-md shadow-indigo-600/20 group-hover:shadow-indigo-600/40 group-hover:scale-105 transition-all duration-300">
                            S
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-[17px] font-black tracking-tight text-gray-900 group-hover:text-indigo-700 transition-colors leading-none">{t('app_name')}</h1>
                        </div>
                    </Link>

                    {/* Center: Navigation Links */}
                    <nav className="flex items-center gap-1">
                        {navItems.map((item) => {
                            const isActive = path === item.path || (path !== '/' && item.path !== '/' && path.startsWith(item.path));
                            const Icon = isActive ? item.activeIcon : item.icon;
                            return (
                                <Link
                                    key={item.name}
                                    to={item.path}
                                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                                        isActive
                                            ? 'bg-gray-100 text-gray-900'
                                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span>{item.name}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-3">
                        {/* User Profile & Sign Out */}
                        {user ? (
                            <div className="flex items-center gap-1.5 pl-3 border-l border-gray-200">
                                <Link to="/profile" className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group">
                                    <div className="w-7 h-7 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 text-xs font-black flex-shrink-0">
                                        {avatarLetter}
                                    </div>
                                    <span className="text-sm font-bold text-gray-700 max-w-[120px] truncate group-hover:text-indigo-600 transition-colors">
                                        {displayName}
                                    </span>
                                </Link>
                                <div className="w-px h-5 bg-gray-200 mx-1"></div>
                                <button
                                    onClick={handleSignOut}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                >
                                    <ArrowRightStartOnRectangleIcon className="w-4 h-4" />
                                    Sign Out
                                </button>
                            </div>
                        ) : (
                            <Link to="/auth"
                                className="px-5 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-all shadow-sm">
                                Sign In
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 w-full max-w-7xl mx-auto p-6 md:pt-24 md:p-12 space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                {children}
            </main>

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] glass-card rounded-3xl border-white/40 shadow-2xl z-50 overflow-hidden">
                <div className="flex justify-around items-center p-3">
                    {navItems.slice(0, 5).map((item) => {
                        const isActive = path === item.path || (path !== '/' && item.path !== '/' && path.startsWith(item.path));
                        const Icon = isActive ? item.activeIcon : item.icon;
                        return (
                            <Link
                                key={item.name}
                                to={item.path}
                                className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all duration-300 ${
                                    isActive ? 'bg-brand-primary/5 text-brand-primary' : 'text-text-secondary'
                                }`}
                            >
                                <Icon className={`w-6 h-6 ${isActive ? 'scale-110' : ''}`} />
                                <span className="text-[10px] font-black uppercase tracking-tighter">{item.name}</span>
                            </Link>
                        );
                    })}
                    {/* Sign Out on mobile */}
                    {user && (
                        <button onClick={handleSignOut}
                            className="flex flex-col items-center gap-1.5 p-2 rounded-2xl text-text-secondary transition-all duration-300">
                            <ArrowRightStartOnRectangleIcon className="w-6 h-6" />
                            <span className="text-[10px] font-black uppercase tracking-tighter">Out</span>
                        </button>
                    )}
                </div>
            </nav>
        </div>
    );
};

export default Layout;
