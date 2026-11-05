import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { SparklesIcon, EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

const Auth = () => {
    const [tab, setTab] = useState('login'); // 'login' | 'signup'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);

    const handleGoogleLogin = async () => {
        setGoogleLoading(true);
        setError(null);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin }
        });
        if (error) { setError(error.message); setGoogleLoading(false); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMsg(null);

        if (tab === 'login') {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) setError(error.message);
        } else {
            const { error } = await supabase.auth.signUp({ email, password });
            if (error) setError(error.message);
            else setSuccessMsg('Account created! Check your email to verify your account.');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/40 to-purple-50/30 p-4">
            {/* Decorative blobs */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-pink-400/5 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-0 bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-indigo-200/40 border border-white overflow-hidden relative z-10">

                {/* LEFT: Branding Panel */}
                <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-indigo-600 to-purple-700 text-white relative overflow-hidden">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full" />
                        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-white/5 rounded-full" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-white/3 rounded-full" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white font-black text-2xl">S</div>
                            <div>
                                <h1 className="text-xl font-black">Scheme Saarthi</h1>
                                <p className="text-indigo-200 text-xs font-medium uppercase tracking-widest">Your Digital Guide</p>
                            </div>
                        </div>
                    </div>
                    <div className="relative z-10 space-y-8">
                        <div>
                            <h2 className="text-3xl font-black leading-tight mb-3">
                                All your government<br />schemes in one place.
                            </h2>
                            <p className="text-indigo-200 text-sm leading-relaxed">
                                Store documents, check eligibility, auto-fill applications, and get AI-powered guidance — all secured under your account.
                            </p>
                        </div>
                        <div className="space-y-3">
                            {[
                                { icon: '🔐', text: 'Secure Document Vault' },
                                { icon: '🤖', text: 'AI-Powered Auto-Fill' },
                                { icon: '✅', text: 'Scheme Eligibility Check' },
                                { icon: '💬', text: 'Smart Scheme Assistant' },
                            ].map((f) => (
                                <div key={f.text} className="flex items-center gap-3">
                                    <span className="text-xl">{f.icon}</span>
                                    <span className="text-sm font-semibold text-indigo-100">{f.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="relative z-10 flex items-center gap-2">
                        <SparklesIcon className="w-4 h-4 text-indigo-300" />
                        <p className="text-indigo-300 text-xs">Powered by Groq AI & Supabase</p>
                    </div>
                </div>

                {/* RIGHT: Auth Form */}
                <div className="flex flex-col justify-center p-8 md:p-12">
                    <div className="lg:hidden flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-xl">S</div>
                        <h1 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">Scheme Saarthi</h1>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-2xl font-black text-gray-900 mb-1">
                            {tab === 'login' ? 'Welcome back 👋' : 'Create account 🚀'}
                        </h2>
                        <p className="text-gray-500 text-sm">
                            {tab === 'login' ? 'Sign in to access your vault and documents.' : 'Join to access AI-powered scheme guidance.'}
                        </p>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex p-1 bg-gray-100 rounded-2xl mb-6">
                        {['login', 'signup'].map((t) => (
                            <button
                                key={t}
                                onClick={() => { setTab(t); setError(null); setSuccessMsg(null); }}
                                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                                    tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {t === 'login' ? 'Sign In' : 'Sign Up'}
                            </button>
                        ))}
                    </div>

                    {/* Google Button */}
                    <button
                        onClick={handleGoogleLogin}
                        disabled={googleLoading}
                        className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30 text-gray-700 font-bold rounded-2xl transition-all duration-200 shadow-sm mb-5 disabled:opacity-60"
                    >
                        {googleLoading ? (
                            <div className="w-5 h-5 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin" />
                        ) : (
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                        )}
                        Continue with Google
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-3 mb-5">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-xs text-gray-400 font-medium">or continue with email</span>
                        <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    {/* Error / Success */}
                    <AnimatePresence>
                        {error && (
                            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                className="flex items-center gap-2 p-3.5 bg-red-50 border border-red-200 rounded-xl mb-4 text-red-700 text-sm">
                                <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
                                {error}
                            </motion.div>
                        )}
                        {successMsg && (
                            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                className="p-3.5 bg-green-50 border border-green-200 rounded-xl mb-4 text-green-700 text-sm font-medium">
                                ✅ {successMsg}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="relative">
                            <EnvelopeIcon className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email address"
                                required
                                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all"
                            />
                        </div>
                        <div className="relative">
                            <LockClosedIcon className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                required
                                minLength={6}
                                className="w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 text-sm font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all"
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/25 transition-all duration-200 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                tab === 'login' ? 'Sign In' : 'Create Account'
                            )}
                        </button>
                    </form>

                    <p className="text-center text-xs text-gray-400 mt-6">
                        By continuing, you agree to our{' '}
                        <span className="text-indigo-500 font-medium cursor-pointer hover:underline">Terms of Service</span>{' '}
                        and{' '}
                        <span className="text-indigo-500 font-medium cursor-pointer hover:underline">Privacy Policy</span>.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Auth;
