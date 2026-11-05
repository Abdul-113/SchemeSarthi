import React, { useState } from 'react';
import { SparklesIcon, CheckCircleIcon, XCircleIcon, DocumentMagnifyingGlassIcon, ArrowRightIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '../components/GlassCard';
import { autofillVaultForm } from '../api/api';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const AutoFill = () => {
    const { t } = useTranslation();
    const [schemeName, setSchemeName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleCheck = async (e) => {
        e.preventDefault();
        if (!schemeName) return;

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const data = await autofillVaultForm(schemeName);
            if (data.status === "error") {
                setError("No Vault Profile found. Please upload documents in the Document Vault first.");
            } else {
                setResult(data);
            }
        } catch (err) {
            setError(err.message || "Failed to check auto-fill status.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 animate-in fade-in space-y-8">
            <div className="text-center space-y-4 pt-4">
                <div className="inline-flex p-4 bg-fuchsia-50 rounded-2xl border border-fuchsia-100">
                    <SparklesIcon className="w-10 h-10 text-fuchsia-600" />
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-gray-900">
                    Smart <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-600 to-pink-600">Auto-Fill</span>
                </h1>
                <p className="text-gray-600 max-w-2xl mx-auto">
                    Enter the name of the scheme you want to apply for. We'll instantly check your Intelligent Document Vault and tell you what's ready to be auto-filled, and what is missing.
                </p>
            </div>

            <GlassCard className="p-6 md:p-8 relative overflow-hidden">
                {/* Decorative background blurs */}
                <div className="absolute -top-32 -right-32 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl" />

                <form onSubmit={handleCheck} className="relative z-10 flex flex-col md:flex-row gap-4 max-w-2xl mx-auto">
                    <div className="flex-1 relative">
                        <DocumentMagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                        <input 
                            type="text"
                            value={schemeName}
                            onChange={(e) => setSchemeName(e.target.value)}
                            placeholder="e.g. PMAY Urban, Sukanya Samriddhi..."
                            className="w-full bg-white/70 border border-gray-200 text-gray-900 pl-12 pr-4 py-4 rounded-2xl focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition-all font-medium text-lg shadow-sm"
                        />
                    </div>
                    <button 
                        type="submit"
                        disabled={isLoading || !schemeName}
                        className="px-8 py-4 bg-gray-900 hover:bg-black text-white font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                        {isLoading ? (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>Check Auto-Fill <ArrowRightIcon className="w-5 h-5" /></>
                        )}
                    </button>
                </form>
            </GlassCard>

            {error && (
                <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-200 text-center shadow-sm">
                    <p className="font-bold text-lg mb-2">{error}</p>
                    <Link to="/documents" className="inline-flex items-center gap-2 text-red-600 hover:text-red-800 font-bold underline">
                        Go to Document Vault <ArrowRightIcon className="w-4 h-4" />
                    </Link>
                </div>
            )}

            <AnimatePresence>
                {result && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-6"
                    >
                        {/* Ready to Auto-Fill */}
                        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-3xl p-6 md:p-8 border border-emerald-100 shadow-sm">
                            <h3 className="text-xl font-bold text-emerald-900 flex items-center gap-2 mb-6">
                                <CheckCircleIcon className="w-7 h-7 text-emerald-500" />
                                Ready to Auto-Fill
                            </h3>
                            {Object.keys(result.filled).length === 0 ? (
                                <p className="text-emerald-700/70 italic text-sm">Nothing found in your Vault. Upload documents first!</p>
                            ) : (
                                <div className="space-y-4">
                                    {Object.entries(result.filled).map(([key, val]) => (
                                        <div key={key} className="bg-white/60 p-4 rounded-xl shadow-sm border border-emerald-500/10">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">{key.replace('_', ' ')}</p>
                                            <p className="font-semibold text-gray-900 truncate">{val}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Missing Requisites */}
                        <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-3xl p-6 md:p-8 border border-red-100 shadow-sm flex flex-col">
                            <h3 className="text-xl font-bold text-red-900 flex items-center gap-2 mb-6">
                                <XCircleIcon className="w-7 h-7 text-red-500" />
                                Missing Requirements
                            </h3>
                            
                            {result.missing.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-2">
                                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
                                        <CheckCircleIcon className="w-8 h-8 text-emerald-600" />
                                    </div>
                                    <p className="font-bold text-gray-900">You're all set!</p>
                                    <p className="text-sm text-gray-600">Your profile contains all standard details required for applications.</p>
                                </div>
                            ) : (
                                <div className="space-y-4 flex-1">
                                    {result.missing.map((key) => (
                                        <div key={key} className="bg-white/60 p-4 rounded-xl shadow-sm border border-red-500/10 flex items-center justify-between">
                                            <p className="text-sm font-bold text-red-900 capitalize">{key.replace('_', ' ')}</p>
                                            <span className="text-xs font-bold text-red-500 bg-red-100 px-2 py-1 rounded-md">Missing</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {result.missing.length > 0 && (
                                <div className="mt-8 pt-6 border-t border-red-200">
                                    <Link to="/documents" className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2">
                                        Upload Missing Docs <CloudArrowUpIcon className="w-5 h-5 ml-1" />
                                    </Link>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AutoFill;
