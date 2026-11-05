import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    SparklesIcon, CheckCircleIcon, XCircleIcon, QuestionMarkCircleIcon,
    ChevronDownIcon, ChevronUpIcon, ArrowTopRightOnSquareIcon,
    DocumentArrowDownIcon, BoltIcon, HomeIcon, AcademicCapIcon,
    CurrencyRupeeIcon, HeartIcon, UserGroupIcon, BuildingOffice2Icon,
    InformationCircleIcon, ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckSolid } from '@heroicons/react/24/solid';
import { checkEligibility, getVaultEligibilityPrefill } from '../api/api';

// ─── Tag → Icon + Color map ──────────────────────────────────────────────────
const TAG_CONFIG = {
    Housing:     { icon: HomeIcon,           bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-500' },
    Education:   { icon: AcademicCapIcon,    bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
    Agriculture: { icon: SparklesIcon,       bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-500' },
    Finance:     { icon: CurrencyRupeeIcon,  bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-500' },
    Health:      { icon: HeartIcon,          bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-500' },
    Women:       { icon: UserGroupIcon,      bg: 'bg-pink-50',   text: 'text-pink-700',   border: 'border-pink-200',   dot: 'bg-pink-500' },
};

const ALL_TAGS = ['All', ...Object.keys(TAG_CONFIG)];

const STATES = [
    "Select State","Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
    "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala",
    "Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland",
    "Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura",
    "Uttar Pradesh","Uttarakhand","West Bengal"
];

const OCCUPATIONS = [
    "Select Occupation","Farmer","Student","Salaried (Govt)","Salaried (Private)",
    "Self-Employed","Artisan","Business Owner","Street Vendor","Labourer","Unemployed","Other"
];

// ─── Field Input Component ────────────────────────────────────────────────────
const Field = ({ label, children, hint }) => (
    <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">{label}</label>
        {children}
        {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
    </div>
);

const inputCls = "w-full px-3.5 py-2.5 bg-white border border-gray-200 text-gray-900 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all placeholder-gray-400";
const selectCls = `${inputCls} appearance-none cursor-pointer`;

// ─── Toggle Pill Component ────────────────────────────────────────────────────
const TogglePill = ({ options, value, onChange }) => (
    <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
        {options.map(opt => (
            <button
                key={opt.value}
                type="button"
                onClick={() => onChange(opt.value)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-150 ${
                    value === opt.value
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                }`}
            >
                {opt.label}
            </button>
        ))}
    </div>
);

// ─── Single Scheme Result Card ─────────────────────────────────────────────────
const SchemeCard = ({ scheme, defaultOpen = false }) => {
    const [open, setOpen] = useState(defaultOpen);
    const tag = scheme.tags?.[0] || 'Finance';
    const tagCfg = TAG_CONFIG[tag] || TAG_CONFIG['Finance'];
    const TagIcon = tagCfg.icon;

    const eligible = scheme.eligible;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white rounded-2xl border overflow-hidden transition-shadow hover:shadow-md ${
                eligible === true  ? 'border-green-200 shadow-sm' :
                eligible === null  ? 'border-amber-200 shadow-sm' :
                                    'border-gray-200'
            }`}
        >
            {/* Card Header */}
            <div
                className="flex items-start justify-between p-5 cursor-pointer"
                onClick={() => setOpen(!open)}
            >
                <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Status Icon */}
                    <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${
                        eligible === true  ? 'bg-green-100' :
                        eligible === null  ? 'bg-amber-100' :
                                            'bg-gray-100'
                    }`}>
                        {eligible === true  ? <CheckSolid className="w-5 h-5 text-green-600" /> :
                         eligible === null  ? <QuestionMarkCircleIcon className="w-5 h-5 text-amber-600" /> :
                                             <XCircleIcon className="w-5 h-5 text-gray-400" />}
                    </div>

                    {/* Scheme Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <h3 className="font-bold text-gray-900 text-sm leading-snug">{scheme.scheme_name}</h3>
                            {/* Tags */}
                            {scheme.tags?.map(t => {
                                const c = TAG_CONFIG[t] || {};
                                return (
                                    <span key={t} className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border ${c.bg} ${c.text} ${c.border}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`}></span>
                                        {t}
                                    </span>
                                );
                            })}
                        </div>
                        <p className="text-xs text-gray-500 mb-1">{scheme.ministry}</p>
                        <p className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md inline-block">
                            💰 {scheme.benefit}
                        </p>
                    </div>
                </div>

                {/* Right: Status badge + chevron */}
                <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                    <span className={`hidden sm:flex px-3 py-1 text-xs font-bold rounded-full ${
                        eligible === true  ? 'bg-green-100 text-green-700' :
                        eligible === null  ? 'bg-amber-100 text-amber-700' :
                                            'bg-gray-100 text-gray-500'
                    }`}>
                        {eligible === true ? 'Eligible' : eligible === null ? 'Partial' : 'Not Eligible'}
                    </span>
                    {open ? <ChevronUpIcon className="w-4 h-4 text-gray-400" /> : <ChevronDownIcon className="w-4 h-4 text-gray-400" />}
                </div>
            </div>

            {/* Expanded Details */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
                            <p className="text-sm text-gray-600">{scheme.description}</p>

                            {/* Rules Breakdown */}
                            <div className="space-y-2">
                                {scheme.rules_passed?.map((r, i) => (
                                    <div key={i} className="flex items-start gap-2 text-sm">
                                        <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                        <span className="text-green-800">{r}</span>
                                    </div>
                                ))}
                                {scheme.rules_failed?.map((r, i) => (
                                    <div key={i} className="flex items-start gap-2 text-sm">
                                        <XCircleIcon className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                        <span className="text-red-700">{r}</span>
                                    </div>
                                ))}
                                {scheme.rules_unknown?.map((r, i) => (
                                    <div key={i} className="flex items-start gap-2 text-sm">
                                        <QuestionMarkCircleIcon className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                        <span className="text-amber-800">{r}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Apply Button */}
                            <a
                                href={scheme.apply_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
                            >
                                Apply Now <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                            </a>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// ─── Main Eligibility Page ────────────────────────────────────────────────────
const Eligibility = () => {
    const [step, setStep] = useState('form');   // 'form' | 'results'
    const [loading, setLoading] = useState(false);
    const [vaultLoading, setVaultLoading] = useState(false);
    const [error, setError] = useState(null);
    const [results, setResults] = useState(null);
    const [activeTag, setActiveTag] = useState('All');
    const [showIneligible, setShowIneligible] = useState(false);
    const resultsRef = useRef(null);

    const [form, setForm] = useState({
        age: '',
        gender: '',
        state: '',
        category: '',
        income: '',
        occupation: '',
        has_house: null,
        land_holding: '',
        has_disability: false,
        is_student: false,
        is_bpl: false,
        is_taxpayer: false,
        owns_four_wheeler: false,
    });

    const handleChange = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

    const handleVaultPrefill = async () => {
        setVaultLoading(true);
        setError(null);
        try {
            const data = await getVaultEligibilityPrefill();
            const p = data.prefill || {};
            setForm(prev => ({
                ...prev,
                income: p.income || prev.income,
                gender: p.gender || prev.gender,
                state: p.state || prev.state,
                category: p.category || prev.category,
                occupation: p.occupation || prev.occupation,
            }));
            if (data.fields_found?.length > 0) {
                setError(null);
            } else {
                setError('No data found in your vault. Please upload documents first or fill the form manually.');
            }
        } catch {
            setError('Could not access vault. Make sure you are signed in and have uploaded documents.');
        } finally {
            setVaultLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResults(null);
        try {
            const data = await checkEligibility(form);
            setResults(data);
            setStep('results');
            setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        } catch (err) {
            setError('Failed to reach the server. Please make sure the backend is running.');
        } finally {
            setLoading(false);
        }
    };

    // Filter results by tag
    const filterByTag = (schemes) => {
        if (activeTag === 'All') return schemes;
        return schemes.filter(s => s.tags?.includes(activeTag));
    };

    const eligibleFiltered  = results ? filterByTag(results.eligible_schemes)  : [];
    const partialFiltered   = results ? filterByTag(results.partial_schemes)   : [];
    const ineligibleFiltered = results ? filterByTag(results.ineligible_schemes) : [];

    return (
        <div className="max-w-5xl mx-auto py-6 px-4 space-y-8">

            {/* ── Page Header ─────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center shadow-lg shadow-indigo-500/25 flex-shrink-0">
                    <SparklesIcon className="w-7 h-7 text-white" />
                </div>
                <div className="text-center sm:text-left">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Check My Eligibility</h1>
                    <p className="text-gray-500 mt-1 text-sm">
                        Instantly discover which government schemes you qualify for — powered by a rules engine + AI.
                    </p>
                </div>
            </div>

            {/* ── Stats Strip (pre-result) ────────────────────────────────── */}
            {!results && (
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: 'Schemes Checked', value: '25+', icon: BuildingOffice2Icon, color: 'text-indigo-600 bg-indigo-50' },
                        { label: 'Categories', value: '6',   icon: SparklesIcon,         color: 'text-purple-600 bg-purple-50' },
                        { label: 'AI + Rules Based', value: '✓', icon: BoltIcon,          color: 'text-green-600 bg-green-50' },
                    ].map(s => (
                        <div key={s.label} className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                                <s.icon className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="font-black text-lg text-gray-900 leading-none">{s.value}</p>
                                <p className="text-[11px] text-gray-500 font-medium">{s.label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Form ────────────────────────────────────────────────────── */}
            <AnimatePresence>
                {step === 'form' && (
                    <motion.div
                        key="form"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden"
                    >
                        {/* Form Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <div>
                                <h2 className="font-bold text-gray-900 text-base">Your Profile</h2>
                                <p className="text-xs text-gray-500">Fill in your details to check eligibility</p>
                            </div>
                            {/* Auto-Fill from Vault button */}
                            <button
                                type="button"
                                onClick={handleVaultPrefill}
                                disabled={vaultLoading}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors disabled:opacity-60"
                            >
                                {vaultLoading
                                    ? <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                                    : <DocumentArrowDownIcon className="w-4 h-4" />
                                }
                                Auto-Fill from Vault
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Error */}
                            {error && (
                                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                                    <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    {error}
                                </div>
                            )}

                            {/* Row 1: Age + Gender */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <Field label="Age" hint="Must be 18+ for most schemes">
                                    <input type="number" min="1" max="120" value={form.age}
                                        onChange={e => handleChange('age', e.target.value)}
                                        className={inputCls} placeholder="e.g. 28" required />
                                </Field>
                                <Field label="Gender">
                                    <TogglePill
                                        options={[{value:'Male',label:'Male'},{value:'Female',label:'Female'},{value:'Other',label:'Other'}]}
                                        value={form.gender}
                                        onChange={v => handleChange('gender', v)}
                                    />
                                </Field>
                            </div>

                            {/* Row 2: State + Category */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <Field label="State">
                                    <select value={form.state} onChange={e => handleChange('state', e.target.value)} className={selectCls} required>
                                        {STATES.map(s => <option key={s} value={s === 'Select State' ? '' : s} disabled={s === 'Select State'}>{s}</option>)}
                                    </select>
                                </Field>
                                <Field label="Caste Category">
                                    <TogglePill
                                        options={[{value:'General',label:'General'},{value:'OBC',label:'OBC'},{value:'SC',label:'SC'},{value:'ST',label:'ST'}]}
                                        value={form.category}
                                        onChange={v => handleChange('category', v)}
                                    />
                                </Field>
                            </div>

                            {/* Row 3: Income + Occupation */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <Field label="Annual Income (₹)" hint="Combined family income">
                                    <input type="number" min="0" value={form.income}
                                        onChange={e => handleChange('income', e.target.value)}
                                        className={inputCls} placeholder="e.g. 240000" required />
                                </Field>
                                <Field label="Occupation">
                                    <select value={form.occupation} onChange={e => handleChange('occupation', e.target.value)} className={selectCls}>
                                        {OCCUPATIONS.map(o => <option key={o} value={o === 'Select Occupation' ? '' : o} disabled={o === 'Select Occupation'}>{o}</option>)}
                                    </select>
                                </Field>
                            </div>

                            {/* Row 4: Toggles */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[
                                    { key: 'has_house', label: 'I own a house' },
                                    { key: 'is_student', label: 'I am a student' },
                                    { key: 'has_disability', label: 'I have a disability' },
                                    { key: 'is_bpl', label: 'I hold a BPL card' },
                                    { key: 'is_taxpayer', label: 'Family pays income tax' },
                                    { key: 'owns_four_wheeler', label: 'Family owns a four-wheeler' },
                                ].map(({ key, label }) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => handleChange(key, !form[key])}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold text-left transition-all ${
                                            form[key]
                                                ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                                                : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                                        }`}
                                    >
                                        <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                            form[key] ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
                                        }`}>
                                            {form[key] && <CheckSolid className="w-3 h-3 text-white" />}
                                        </span>
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {/* Optional: Land holding */}
                            {(form.occupation === 'Farmer') && (
                                <Field label="Land Holding (Hectares)" hint="Required for farmer-specific schemes">
                                    <input type="number" min="0" step="0.1" value={form.land_holding}
                                        onChange={e => handleChange('land_holding', e.target.value)}
                                        className={inputCls} placeholder="e.g. 1.5" />
                                </Field>
                            )}

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading || !form.age || !form.gender || !form.category || !form.state || !form.income}
                                className={`w-full py-3.5 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all ${
                                    loading || !form.age || !form.gender || !form.category || !form.state || !form.income
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-gray-900 hover:bg-gray-800 text-white shadow-sm hover:shadow-md'
                                }`}
                            >
                                {loading
                                    ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analysing...</>
                                    : <><BoltIcon className="w-5 h-5" /> Check My Eligibility</>
                                }
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Results ──────────────────────────────────────────────────── */}
            <AnimatePresence>
                {results && step === 'results' && (
                    <motion.div
                        key="results"
                        ref={resultsRef}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        {/* Summary Banner */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {[
                                { label: 'Eligible', value: results.summary.eligible_count, color: 'text-green-700 bg-green-50 border-green-200' },
                                { label: 'Partial Match', value: results.summary.partial_count, color: 'text-amber-700 bg-amber-50 border-amber-200' },
                                { label: 'Not Eligible', value: results.summary.ineligible_count, color: 'text-gray-600 bg-gray-50 border-gray-200' },
                                { label: 'Total Checked', value: results.summary.total_checked, color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
                            ].map(s => (
                                <div key={s.label} className={`rounded-2xl border p-4 text-center ${s.color}`}>
                                    <p className="text-3xl font-black">{s.value}</p>
                                    <p className="text-xs font-semibold uppercase tracking-wide mt-1">{s.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* AI Narrative */}
                        {results.ai_narrative && (
                            <div className="flex gap-4 p-5 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl">
                                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
                                    <SparklesIcon className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">AI Insights</p>
                                    <p className="text-sm text-gray-700 leading-relaxed">{results.ai_narrative}</p>
                                </div>
                            </div>
                        )}

                        {/* Filter Tabs + Modify Button */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex gap-2 flex-wrap">
                                {ALL_TAGS.map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => setActiveTag(tag)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            activeTag === tag
                                                ? 'bg-gray-900 text-white shadow-sm'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setStep('form')}
                                className="text-sm font-semibold text-indigo-600 hover:underline underline-offset-2 flex items-center gap-1"
                            >
                                ← Modify Profile
                            </button>
                        </div>

                        {/* Eligible Schemes */}
                        {eligibleFiltered.length > 0 && (
                            <div className="space-y-3">
                                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                                    <CheckSolid className="w-5 h-5 text-green-600" />
                                    Eligible Schemes ({eligibleFiltered.length})
                                </h2>
                                {eligibleFiltered.map((s, i) => (
                                    <SchemeCard key={s.scheme_key} scheme={s} defaultOpen={i === 0} />
                                ))}
                            </div>
                        )}

                        {/* Partial Schemes */}
                        {partialFiltered.length > 0 && (
                            <div className="space-y-3">
                                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                                    <QuestionMarkCircleIcon className="w-5 h-5 text-amber-600" />
                                    Partial Match — More Info Needed ({partialFiltered.length})
                                </h2>
                                {partialFiltered.map(s => (
                                    <SchemeCard key={s.scheme_key} scheme={s} />
                                ))}
                            </div>
                        )}

                        {/* No results */}
                        {eligibleFiltered.length === 0 && partialFiltered.length === 0 && (
                            <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
                                <InformationCircleIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                <p className="font-semibold text-gray-600">No schemes match this filter.</p>
                                <p className="text-sm text-gray-400 mt-1">Try selecting "All" or a different category.</p>
                            </div>
                        )}

                        {/* Ineligible (collapsible) */}
                        {ineligibleFiltered.length > 0 && (
                            <div>
                                <button
                                    onClick={() => setShowIneligible(!showIneligible)}
                                    className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-700 mb-3"
                                >
                                    {showIneligible ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                                    {showIneligible ? 'Hide' : 'Show'} Non-Eligible Schemes ({ineligibleFiltered.length})
                                </button>
                                <AnimatePresence>
                                    {showIneligible && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="space-y-3 overflow-hidden"
                                        >
                                            {ineligibleFiltered.map(s => (
                                                <SchemeCard key={s.scheme_key} scheme={s} />
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Eligibility;
