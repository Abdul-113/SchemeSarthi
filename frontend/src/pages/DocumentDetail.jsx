import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeftIcon, TrashIcon, ExclamationTriangleIcon,
    CheckCircleIcon, ClockIcon, ArrowTopRightOnSquareIcon,
    SparklesIcon, ShieldCheckIcon, InformationCircleIcon,
    DocumentTextIcon, LinkIcon, BoltIcon, ExclamationCircleIcon,
    ArrowDownTrayIcon, ChevronRightIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckSolid, XCircleIcon as XSolid } from '@heroicons/react/24/solid';
import { getDocumentDetail, deleteVaultDocument } from '../api/api';

// ─── Config ───────────────────────────────────────────────────────────────────
const DOC_TYPE_CONFIG = {
    'Aadhaar Card':         { emoji: '🪪', color: 'text-blue-700 bg-blue-50 border-blue-200',   schemes: ['PMAY Urban', 'PMJAY Ayushman', 'PM Kisan', 'Mudra Shishu', 'Ladki Bahin Yojana'] },
    'PAN Card':             { emoji: '💳', color: 'text-amber-700 bg-amber-50 border-amber-200', schemes: ['Mudra Kishore', 'Stand-Up India', 'PMVVY Pension'] },
    'Income Certificate':   { emoji: '💰', color: 'text-green-700 bg-green-50 border-green-200', schemes: ['PMAY Urban', 'SC Scholarship', 'OBC Scholarship', 'PMJAY Ayushman', 'Ladki Bahin Yojana'] },
    'Caste Certificate':    { emoji: '📋', color: 'text-purple-700 bg-purple-50 border-purple-200', schemes: ['SC Scholarship', 'ST Scholarship', 'Stand-Up India', 'OBC Scholarship'] },
    'Domicile Certificate': { emoji: '🏠', color: 'text-rose-700 bg-rose-50 border-rose-200',   schemes: ['Mahadbt Scholarship', 'PMAY Gramin', 'Ladki Bahin Yojana'] },
    'Bank Statement':       { emoji: '🏦', color: 'text-cyan-700 bg-cyan-50 border-cyan-200',   schemes: ['PMAY Urban', 'Mudra Kishore', 'Kisan Credit Card'] },
    'Marksheet':            { emoji: '🎓', color: 'text-indigo-700 bg-indigo-50 border-indigo-200', schemes: ['SC Scholarship', 'NSP Merit Scholarship', 'Mahadbt Scholarship'] },
    'Passport':             { emoji: '✈️', color: 'text-teal-700 bg-teal-50 border-teal-200',   schemes: ['StandUp India', 'Mudra Kishore'] },
    'Other':                { emoji: '📎', color: 'text-gray-600 bg-gray-50 border-gray-200',   schemes: [] },
};

const CONFIDENCE_CONFIG = {
    high:   { label: 'High',   color: 'text-green-600 bg-green-50',  bar: 'bg-green-500', width: '90%' },
    medium: { label: 'Medium', color: 'text-amber-600 bg-amber-50',  bar: 'bg-amber-400', width: '55%' },
    low:    { label: 'Low',    color: 'text-red-600 bg-red-50',      bar: 'bg-red-400',   width: '25%' },
};

// ─── Helper: Prettify field label ─────────────────────────────────────────────
const prettify = (key) =>
    key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

// Key sensitivity map (which keys are important / PII)
const KEY_IMPORTANCE = {
    name: 'high', full_name: 'high', applicant_name: 'high',
    dob: 'high', date_of_birth: 'high',
    aadhaar_number: 'high', aadhaar: 'high',
    income: 'medium', annual_income: 'medium',
    address: 'medium', permanent_address: 'medium',
    father_name: 'medium', father: 'medium',
    gender: 'low', category: 'low', caste: 'low',
    state: 'low', district: 'low',
};

// ─── Confidence Bar ───────────────────────────────────────────────────────────
const ConfBar = ({ level }) => {
    const cfg = CONFIDENCE_CONFIG[level?.toLowerCase()] || CONFIDENCE_CONFIG.medium;
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: cfg.width }} />
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
        </div>
    );
};

// ─── Document Preview Panel ───────────────────────────────────────────────────
const PreviewPanel = ({ doc }) => {
    const isPdf = doc.filename?.toLowerCase().endsWith('.pdf');
    const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(doc.filename || '');

    return (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-sm font-bold text-gray-700">Document Preview</h3>
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                    Open Original <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                </a>
            </div>
            <div className="flex-1 bg-gray-100 min-h-[420px] flex items-center justify-center relative">
                {isPdf ? (
                    <iframe
                        src={doc.file_url.startsWith('http://localhost') || doc.file_url.startsWith('local://')
                            ? doc.file_url
                            : `https://docs.google.com/gview?url=${encodeURIComponent(doc.file_url)}&embedded=true`}
                        className="w-full h-[480px] border-0 bg-white"
                        title="PDF Preview"
                    />
                ) : isImage ? (
                    <img
                        src={doc.file_url}
                        alt={doc.filename}
                        className="max-w-full max-h-[480px] object-contain p-4"
                        onError={e => { e.target.style.display = 'none'; }}
                    />
                ) : (
                    <div className="flex flex-col items-center text-gray-400 p-8">
                        <DocumentTextIcon className="w-14 h-14 mb-3 opacity-40" />
                        <p className="text-sm font-medium">Preview not available</p>
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                            className="mt-2 text-indigo-500 text-sm font-semibold hover:underline">
                            Open in new tab →
                        </a>
                    </div>
                )}
            </div>
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-500">{doc.filename}</span>
                <a href={doc.file_url} download
                    className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors">
                    <ArrowDownTrayIcon className="w-3.5 h-3.5" /> Download
                </a>
            </div>
        </div>
    );
};

// ─── Main DocumentDetail Page ─────────────────────────────────────────────────
const DocumentDetail = () => {
    const { docId } = useParams();
    const navigate = useNavigate();
    const [doc, setDoc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('extracted'); // 'extracted' | 'raw'

    const fetchDocument = useCallback(async () => {
        try {
            const data = await getDocumentDetail(docId);
            setDoc(data);
            setError(null);
        } catch {
            setError('Document not found or failed to load.');
        } finally {
            setLoading(false);
        }
    }, [docId]);

    useEffect(() => { fetchDocument(); }, [fetchDocument]);

    // Poll while pending
    useEffect(() => {
        if (!doc || doc.extraction_status !== 'pending') return;
        const interval = setInterval(fetchDocument, 4000);
        return () => clearInterval(interval);
    }, [doc, fetchDocument]);

    const handleDelete = async () => {
        if (!window.confirm('Delete this document permanently?')) return;
        try {
            await deleteVaultDocument(docId);
            navigate('/documents');
        } catch {
            setError('Failed to delete document.');
        }
    };

    if (loading) return (
        <div className="max-w-6xl mx-auto py-20 flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Loading document…</p>
        </div>
    );

    if (error || !doc) return (
        <div className="max-w-6xl mx-auto py-20 text-center space-y-4">
            <ExclamationTriangleIcon className="w-12 h-12 text-red-300 mx-auto" />
            <p className="text-red-600 font-bold">{error || 'Document not found'}</p>
            <button onClick={() => navigate('/documents')}
                className="text-indigo-600 font-bold text-sm hover:underline">← Back to Vault</button>
        </div>
    );

    const extracted = doc.extracted_data || {};
    const confidence = extracted.confidence || {};
    // Filter out internal keys
    const displayFields = Object.entries(extracted).filter(
        ([k]) => k !== 'confidence' && k !== 'raw_text'
    );
    const status = doc.extraction_status;
    const cfg = DOC_TYPE_CONFIG[doc.doc_type] || DOC_TYPE_CONFIG['Other'];

    // Health score
    const filled = displayFields.filter(([, v]) => v && String(v).trim() !== '').length;
    const healthScore = displayFields.length > 0
        ? Math.round((filled / displayFields.length) * 100)
        : (status === 'completed' ? 70 : 0);

    // Issues detection (simple heuristics)
    const issues = [];
    if (status === 'completed') {
        if (!extracted.name && !extracted.full_name) issues.push({ type: 'missing', msg: 'Name field could not be extracted — document may be unclear' });
        if (!extracted.dob && !extracted.date_of_birth && (doc.doc_type === 'Aadhaar Card' || doc.doc_type === 'PAN Card'))
            issues.push({ type: 'missing', msg: 'Date of Birth missing from this document' });
        if (doc.doc_type === 'Income Certificate' && extracted.income) {
            const incomeStr = String(extracted.income).replace(/[^0-9]/g, '');
            const income = parseInt(incomeStr, 10);
            if (income > 2000000) issues.push({ type: 'warning', msg: 'Income appears very high — verify this is annual income in ₹' });
        }
        if (healthScore < 50) issues.push({ type: 'warning', msg: `Only ${healthScore}% of expected fields extracted — document may need re-upload` });
    }

    const relativeTime = (() => {
        const diff = Date.now() - new Date(doc.uploaded_at).getTime();
        const days = Math.floor(diff / 86400000);
        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        return `${days} days ago`;
    })();

    return (
        <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">

            {/* ── Top Bar ──────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <button onClick={() => navigate('/documents')}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">
                    <ArrowLeftIcon className="w-4 h-4" /> Back to Vault
                </button>
                <button onClick={handleDelete}
                    className="flex items-center gap-1.5 text-sm font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-xl transition-colors">
                    <TrashIcon className="w-4 h-4" /> Delete
                </button>
            </div>

            {/* ── Document Header ───────────────────────────────────────────── */}
            <div className="flex items-start gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border flex-shrink-0 ${cfg.color}`}>
                    {cfg.emoji}
                </div>
                <div className="flex-1 min-w-0">
                    <h1 className="text-xl font-black text-gray-900 truncate">{doc.filename}</h1>
                    <div className="flex items-center flex-wrap gap-2 mt-1">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${cfg.color}`}>{doc.doc_type}</span>
                        <span className="text-xs text-gray-400">Uploaded {relativeTime}</span>
                        {status === 'completed' && (
                            <span className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-full">
                                <CheckSolid className="w-3 h-3" /> Verified
                            </span>
                        )}
                        {status === 'pending' && (
                            <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                                <div className="w-3 h-3 border-2 border-amber-400 border-t-amber-700 rounded-full animate-spin" />
                                Processing
                            </span>
                        )}
                        {status === 'failed' && (
                            <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full">
                                <XSolid className="w-3 h-3" /> Failed
                            </span>
                        )}
                    </div>
                </div>

                {/* Health Score */}
                {status === 'completed' && (
                    <div className="hidden sm:flex flex-col items-center gap-1 flex-shrink-0">
                        <div className={`w-14 h-14 rounded-full border-4 flex items-center justify-center font-black text-lg ${
                            healthScore >= 80 ? 'border-green-400 text-green-600' :
                            healthScore >= 50 ? 'border-amber-400 text-amber-600' :
                                               'border-red-400 text-red-600'
                        }`}>{healthScore}%</div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Health</span>
                    </div>
                )}
            </div>

            {/* ── Two-Column Layout ──────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-6">

                {/* LEFT: Preview */}
                <PreviewPanel doc={doc} />

                {/* RIGHT: Intelligence Panel */}
                <div className="space-y-4">

                    {/* Pending State */}
                    {status === 'pending' && (
                        <div className="bg-white border border-amber-200 rounded-2xl p-8 flex flex-col items-center gap-4 text-center">
                            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                            <div>
                                <p className="font-bold text-gray-900">AI is analyzing your document</p>
                                <p className="text-sm text-gray-500 mt-1">Extracting data — this takes 5–20 seconds</p>
                            </div>
                        </div>
                    )}

                    {/* Failed State */}
                    {status === 'failed' && (
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-2">
                            <XSolid className="w-10 h-10 text-red-400 mx-auto" />
                            <p className="font-bold text-red-700">Extraction Failed</p>
                            <p className="text-sm text-gray-500">Re-upload a clearer image or PDF for better results.</p>
                        </div>
                    )}

                    {/* Completed: Tabs */}
                    {status === 'completed' && (
                        <>
                            {/* Tab Headers */}
                            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                                {[
                                    { key: 'extracted', label: '🧠 Extracted Data' },
                                    { key: 'raw', label: '📄 Raw Text' },
                                ].map(t => (
                                    <button key={t.key} onClick={() => setActiveTab(t.key)}
                                        className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                                            activeTab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                        }`}>
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            {/* Tab: Extracted Data */}
                            {activeTab === 'extracted' && (
                                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                                        <SparklesIcon className="w-4 h-4 text-indigo-500" />
                                        <h3 className="text-sm font-bold text-gray-800">AI-Extracted Fields</h3>
                                        <span className="ml-auto text-xs text-gray-400">{filled}/{displayFields.length} fields found</span>
                                    </div>
                                    <div className="divide-y divide-gray-50">
                                        {displayFields.length === 0 ? (
                                            <div className="p-6 text-center text-gray-400">
                                                <InformationCircleIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                <p className="text-sm">No fields were extracted.</p>
                                            </div>
                                        ) : (
                                            displayFields.map(([key, value], i) => {
                                                const conf = confidence[key] || confidence[`${key}_confidence`];
                                                const hasValue = value && String(value).trim() !== '';
                                                return (
                                                    <motion.div
                                                        key={key}
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        transition={{ delay: i * 0.04 }}
                                                        className="px-4 py-3 space-y-1 hover:bg-gray-50/50 transition-colors"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{prettify(key)}</span>
                                                            {hasValue
                                                                ? <CheckSolid className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                                                                : <XSolid className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />}
                                                        </div>
                                                        <p className={`text-sm font-semibold ${hasValue ? 'text-gray-900' : 'text-gray-300 italic'}`}>
                                                            {hasValue ? String(value) : 'Not detected'}
                                                        </p>
                                                        {conf && <ConfBar level={conf} />}
                                                    </motion.div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Tab: Raw Text */}
                            {activeTab === 'raw' && (
                                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                                        <h3 className="text-sm font-bold text-gray-800">Raw OCR Text</h3>
                                    </div>
                                    <div className="p-4 max-h-[400px] overflow-y-auto">
                                        <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono leading-relaxed">
                                            {doc.raw_text || 'No raw text available.'}
                                        </pre>
                                    </div>
                                </div>
                            )}

                            {/* Issues Section */}
                            {issues.length > 0 && (
                                <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
                                    <div className="px-4 py-3 border-b border-amber-200/60 flex items-center gap-2">
                                        <ExclamationCircleIcon className="w-4 h-4 text-amber-600" />
                                        <h3 className="text-sm font-bold text-amber-800">Issues Detected</h3>
                                    </div>
                                    <div className="divide-y divide-amber-100">
                                        {issues.map((issue, i) => (
                                            <div key={i} className="flex items-start gap-3 px-4 py-3">
                                                {issue.type === 'missing'
                                                    ? <XSolid className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                                    : <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />}
                                                <p className="text-sm text-amber-800">{issue.msg}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Used In / Scheme Applicability */}
                            {cfg.schemes.length > 0 && (
                                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                                        <LinkIcon className="w-4 h-4 text-indigo-500" />
                                        <h3 className="text-sm font-bold text-gray-800">Applicable For Schemes</h3>
                                    </div>
                                    <div className="p-4 flex flex-wrap gap-2">
                                        {cfg.schemes.map(s => (
                                            <span key={s} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl">
                                                <CheckSolid className="w-3 h-3 text-indigo-500" /> {s}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* AI Actions */}
                            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl overflow-hidden">
                                <div className="px-4 py-3 border-b border-indigo-100/60 flex items-center gap-2">
                                    <BoltIcon className="w-4 h-4 text-indigo-600" />
                                    <h3 className="text-sm font-bold text-gray-800">Quick Actions</h3>
                                </div>
                                <div className="p-4 grid grid-cols-1 gap-2">
                                    <Link to="/eligibility"
                                        className="flex items-center gap-3 p-3 bg-white hover:bg-indigo-50 border border-indigo-100 rounded-xl transition-colors group">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                            <SparklesIcon className="w-4 h-4 text-indigo-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900">Check Eligibility</p>
                                            <p className="text-xs text-gray-500">Use vault data to auto-check schemes</p>
                                        </div>
                                        <ChevronRightIcon className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                                    </Link>
                                    <Link to="/risk-check"
                                        className="flex items-center gap-3 p-3 bg-white hover:bg-purple-50 border border-purple-100 rounded-xl transition-colors group">
                                        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                                            <ShieldCheckIcon className="w-4 h-4 text-purple-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900">Analyze Risk</p>
                                            <p className="text-xs text-gray-500">Detect rejection risk for applications</p>
                                        </div>
                                        <ChevronRightIcon className="w-4 h-4 text-gray-300 group-hover:text-purple-500 transition-colors" />
                                    </Link>
                                    <Link to="/autofill"
                                        className="flex items-center gap-3 p-3 bg-white hover:bg-cyan-50 border border-cyan-100 rounded-xl transition-colors group">
                                        <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center flex-shrink-0">
                                            <DocumentTextIcon className="w-4 h-4 text-cyan-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900">Auto-Fill Application</p>
                                            <p className="text-xs text-gray-500">Use extracted data to fill forms</p>
                                        </div>
                                        <ChevronRightIcon className="w-4 h-4 text-gray-300 group-hover:text-cyan-500 transition-colors" />
                                    </Link>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DocumentDetail;
