import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CloudArrowUpIcon, MagnifyingGlassIcon, FunnelIcon,
    TrashIcon, EyeIcon, SparklesIcon, CheckCircleIcon,
    ClockIcon, ExclamationTriangleIcon, XMarkIcon,
    DocumentTextIcon, ShieldCheckIcon, Squares2X2Icon,
    ListBulletIcon, ArrowUpTrayIcon, FolderOpenIcon,
    ChevronDownIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckSolid } from '@heroicons/react/24/solid';
import { uploadVaultDocument, getVaultProfile, deleteVaultDocument } from '../api/api';

// ─── Constants ────────────────────────────────────────────────────────────────
const DOC_TYPES = [
    'Aadhaar Card', 'PAN Card', 'Income Certificate',
    'Caste Certificate', 'Domicile Certificate',
    'Bank Statement', 'Marksheet', 'Passport', 'Other'
];

const DOC_TYPE_CONFIG = {
    'Aadhaar Card':          { emoji: '🪪', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    'PAN Card':              { emoji: '💳', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    'Income Certificate':    { emoji: '💰', color: 'bg-green-50 text-green-700 border-green-200' },
    'Caste Certificate':     { emoji: '📋', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    'Domicile Certificate':  { emoji: '🏠', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    'Bank Statement':        { emoji: '🏦', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    'Marksheet':             { emoji: '🎓', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    'Passport':              { emoji: '✈️', color: 'bg-teal-50 text-teal-700 border-teal-200' },
    'Other':                 { emoji: '📎', color: 'bg-gray-50 text-gray-600 border-gray-200' },
};

const STATUS_CONFIG = {
    pending:   { label: 'Processing', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400', icon: ClockIcon },
    completed: { label: 'Verified',   color: 'bg-green-100 text-green-700', dot: 'bg-green-500', icon: CheckSolid },
    failed:    { label: 'Failed',     color: 'bg-red-100 text-red-600',     dot: 'bg-red-400',   icon: ExclamationTriangleIcon },
};

// ─── Health Score Helper ──────────────────────────────────────────────────────
const getHealthScore = (doc) => {
    if (doc.extraction_status === 'pending') return null;
    if (doc.extraction_status === 'failed') return 0;
    const data = doc.extracted_data || {};
    const keys = Object.keys(data).filter(k => k !== 'confidence');
    const filled = keys.filter(k => data[k] && String(data[k]).trim() !== '');
    if (keys.length === 0) return 70;
    return Math.min(100, Math.round((filled.length / Math.max(keys.length, 1)) * 100));
};

const HealthBar = ({ score }) => {
    if (score === null) return null;
    const color = score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-amber-400' : 'bg-red-400';
    const label = score >= 80 ? 'Healthy' : score >= 50 ? 'Partial' : 'Low';
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
            </div>
            <span className="text-[10px] font-bold text-gray-500 w-12 text-right">{score}% {label}</span>
        </div>
    );
};

// ─── Upload Modal ─────────────────────────────────────────────────────────────
const UploadModal = ({ onClose, onUpload, uploading }) => {
    const fileRef = useRef(null);
    const [docType, setDocType] = useState(DOC_TYPES[0]);
    const [dragOver, setDragOver] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) setSelectedFile(file);
    };

    const handleSubmit = () => {
        if (!selectedFile) return;
        onUpload(selectedFile, docType);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="font-bold text-gray-900 text-lg">Upload Document</h2>
                        <p className="text-xs text-gray-500 mt-0.5">AI will extract and verify details automatically</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                        <XMarkIcon className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Doc Type */}
                <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Document Type</label>
                    <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                        {DOC_TYPES.map(t => {
                            const cfg = DOC_TYPE_CONFIG[t] || DOC_TYPE_CONFIG['Other'];
                            return (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setDocType(t)}
                                    className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-center transition-all text-xs font-semibold ${
                                        docType === t
                                            ? 'border-indigo-400 bg-indigo-50 text-indigo-700 shadow-sm'
                                            : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    <span className="text-lg">{cfg.emoji}</span>
                                    <span className="leading-tight">{t}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Drop Zone */}
                <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center gap-2 cursor-pointer transition-all ${
                        dragOver    ? 'border-indigo-400 bg-indigo-50' :
                        selectedFile ? 'border-green-400 bg-green-50' :
                                      'border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/30'
                    }`}
                >
                    {selectedFile ? (
                        <>
                            <CheckSolid className="w-8 h-8 text-green-500" />
                            <p className="text-sm font-bold text-green-700">{selectedFile.name}</p>
                            <p className="text-xs text-green-600">{(selectedFile.size / 1024).toFixed(0)} KB — Click to change</p>
                        </>
                    ) : (
                        <>
                            <CloudArrowUpIcon className="w-8 h-8 text-gray-400" />
                            <p className="text-sm font-semibold text-gray-700">Drag & drop or click to browse</p>
                            <p className="text-xs text-gray-400">PDF, JPG, PNG — Max 5MB</p>
                        </>
                    )}
                    <input type="file" ref={fileRef} className="hidden" accept="application/pdf,image/*"
                        onChange={e => setSelectedFile(e.target.files?.[0] || null)} />
                </div>

                {/* Upload Button */}
                <button
                    onClick={handleSubmit}
                    disabled={!selectedFile || uploading}
                    className={`w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                        !selectedFile || uploading
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-900 hover:bg-gray-800 text-white shadow-sm'
                    }`}
                >
                    {uploading
                        ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Uploading...</>
                        : <><ArrowUpTrayIcon className="w-4 h-4" /> Upload & Process</>
                    }
                </button>
            </motion.div>
        </motion.div>
    );
};

// ─── Document Card ─────────────────────────────────────────────────────────────
const DocCard = ({ doc, onDelete, onView, view }) => {
    const cfg = DOC_TYPE_CONFIG[doc.doc_type] || DOC_TYPE_CONFIG['Other'];
    const status = STATUS_CONFIG[doc.extraction_status] || STATUS_CONFIG.pending;
    const StatusIcon = status.icon;
    const health = getHealthScore(doc);
    const relativeTime = (() => {
        const diff = Date.now() - new Date(doc.uploaded_at).getTime();
        const days = Math.floor(diff / 86400000);
        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        return `${days} days ago`;
    })();

    if (view === 'list') {
        return (
            <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => onView(doc.id)}
                className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer group"
            >
                {/* Icon */}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 border ${cfg.color}`}>
                    {cfg.emoji}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{doc.filename}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-gray-500">{doc.doc_type}</span>
                        <span className="text-gray-300">·</span>
                        <span className="text-[11px] text-gray-400">{relativeTime}</span>
                    </div>
                </div>

                {/* Health */}
                <div className="hidden sm:block w-32">
                    <HealthBar score={health} />
                </div>

                {/* Status */}
                <span className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold flex-shrink-0 ${status.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
                    {status.label}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={e => { e.stopPropagation(); onView(doc.id); }}
                        className="p-2 hover:bg-indigo-50 hover:text-indigo-600 text-gray-400 rounded-xl transition-colors">
                        <EyeIcon className="w-4 h-4" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); onDelete(doc.id, e); }}
                        className="p-2 hover:bg-red-50 hover:text-red-500 text-gray-400 rounded-xl transition-colors">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            </motion.div>
        );
    }

    // Grid view
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => onView(doc.id)}
            className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-indigo-200 hover:shadow-lg transition-all cursor-pointer group flex flex-col gap-4"
        >
            {/* Top: Icon + Status */}
            <div className="flex items-start justify-between">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border ${cfg.color}`}>
                    {cfg.emoji}
                </div>
                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${status.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
                    {status.label}
                </span>
            </div>

            {/* Doc info */}
            <div>
                <p className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">{doc.filename}</p>
                <p className="text-xs text-gray-500 mt-1">{doc.doc_type} · {relativeTime}</p>
            </div>

            {/* Health Bar */}
            <HealthBar score={health} />

            {/* Actions */}
            <div className="flex gap-2 pt-1 border-t border-gray-50 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={e => { e.stopPropagation(); onView(doc.id); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors">
                    <EyeIcon className="w-3.5 h-3.5" /> View
                </button>
                <button onClick={e => { e.stopPropagation(); onDelete(doc.id, e); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors">
                    <TrashIcon className="w-3.5 h-3.5" /> Delete
                </button>
            </div>
        </motion.div>
    );
};

// ─── Main Documents Page ───────────────────────────────────────────────────────
const Documents = () => {
    const navigate = useNavigate();
    const [docs, setDocs] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [toast, setToast] = useState(null); // { type: 'success'|'error', msg }
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [view, setView] = useState('grid'); // 'grid' | 'list'
    const [showFilters, setShowFilters] = useState(false);
    const [loadingDocs, setLoadingDocs] = useState(true);

    const showToast = (type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    };

    const loadDocuments = useCallback(async () => {
        try {
            const data = await getVaultProfile();
            if (data.documents) setDocs(data.documents);
        } catch (err) {
            console.error('Failed to load docs:', err);
        } finally {
            setLoadingDocs(false);
        }
    }, []);

    useEffect(() => { loadDocuments(); }, [loadDocuments]);

    // Poll while any doc is pending
    useEffect(() => {
        const hasPending = docs.some(d => d.extraction_status === 'pending');
        if (!hasPending) return;
        const interval = setInterval(loadDocuments, 5000);
        return () => clearInterval(interval);
    }, [docs, loadDocuments]);

    const handleUpload = async (file, docType) => {
        setUploading(true);
        try {
            const res = await uploadVaultDocument(file, docType);
            if (res.status === 'error') throw new Error(res.message);
            showToast('success', `${file.name} uploaded! AI is processing…`);
            setShowUpload(false);
            loadDocuments();
        } catch (err) {
            showToast('error', err.message || 'Upload failed.');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (docId, e) => {
        e?.stopPropagation();
        if (!window.confirm('Delete this document permanently?')) return;
        try {
            await deleteVaultDocument(docId);
            showToast('success', 'Document deleted.');
            loadDocuments();
        } catch {
            showToast('error', 'Failed to delete.');
        }
    };

    // Filtered + searched docs
    const filtered = docs.filter(d => {
        const matchSearch = !search
            || d.filename.toLowerCase().includes(search.toLowerCase())
            || d.doc_type.toLowerCase().includes(search.toLowerCase());
        const matchType = filterType === 'All' || d.doc_type === filterType;
        const matchStatus = filterStatus === 'All' || d.extraction_status === filterStatus.toLowerCase();
        return matchSearch && matchType && matchStatus;
    });

    // Stats
    const verified = docs.filter(d => d.extraction_status === 'completed').length;
    const processing = docs.filter(d => d.extraction_status === 'pending').length;
    const avgHealth = docs.length
        ? Math.round(docs.map(d => getHealthScore(d) ?? 0).reduce((a, b) => a + b, 0) / docs.length)
        : 0;

    return (
        <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                        <ShieldCheckIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Document Vault</h1>
                        <p className="text-sm text-gray-500">AI-powered secure document intelligence</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowUpload(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-bold rounded-xl transition-all shadow-sm hover:shadow-md"
                >
                    <ArrowUpTrayIcon className="w-4 h-4" /> Upload Document
                </button>
            </div>

            {/* ── Stats Strip ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Total Documents', value: docs.length, icon: DocumentTextIcon, color: 'text-indigo-600 bg-indigo-50' },
                    { label: 'Verified',         value: verified,    icon: CheckSolid,      color: 'text-green-600 bg-green-50' },
                    { label: 'Processing',        value: processing,  icon: ClockIcon,       color: 'text-amber-600 bg-amber-50' },
                    { label: 'Vault Health',      value: `${avgHealth}%`, icon: SparklesIcon,    color: 'text-purple-600 bg-purple-50' },
                ].map(s => (
                    <div key={s.label} className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}>
                            <s.icon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-black text-xl text-gray-900 leading-none">{s.value}</p>
                            <p className="text-[11px] text-gray-500 font-medium mt-0.5">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Search + Filters + View Toggle ──────────────────────────── */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search documents…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                    />
                </div>

                {/* Filter Toggle */}
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-semibold transition-all ${
                        showFilters || filterType !== 'All' || filterStatus !== 'All'
                            ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                >
                    <FunnelIcon className="w-4 h-4" />
                    Filters
                    {(filterType !== 'All' || filterStatus !== 'All') && (
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    )}
                </button>

                {/* View Toggle */}
                <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
                    <button onClick={() => setView('grid')}
                        className={`p-2 rounded-lg transition-all ${view === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}>
                        <Squares2X2Icon className="w-4 h-4 text-gray-600" />
                    </button>
                    <button onClick={() => setView('list')}
                        className={`p-2 rounded-lg transition-all ${view === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}>
                        <ListBulletIcon className="w-4 h-4 text-gray-600" />
                    </button>
                </div>
            </div>

            {/* ── Filter Panel ─────────────────────────────────────────────── */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="bg-white border border-gray-100 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Document Type</label>
                                <div className="flex flex-wrap gap-2">
                                    {['All', ...DOC_TYPES].map(t => (
                                        <button key={t} onClick={() => setFilterType(t)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                                filterType === t ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}>
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Status</label>
                                <div className="flex flex-wrap gap-2">
                                    {['All', 'Completed', 'Pending', 'Failed'].map(s => (
                                        <button key={s} onClick={() => setFilterStatus(s)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                                filterStatus === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}>
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Document Grid / List ─────────────────────────────────────── */}
            {loadingDocs ? (
                <div className="flex flex-col items-center py-20 gap-4">
                    <div className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">Loading your vault…</p>
                </div>
            ) : filtered.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center py-20 gap-4 bg-white rounded-3xl border border-gray-100"
                >
                    <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center">
                        <FolderOpenIcon className="w-8 h-8 text-gray-300" />
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-gray-700">{docs.length === 0 ? 'Your vault is empty' : 'No documents match'}</p>
                        <p className="text-sm text-gray-400 mt-1">
                            {docs.length === 0 ? 'Upload your first document to get started' : 'Try adjusting your search or filters'}
                        </p>
                    </div>
                    {docs.length === 0 && (
                        <button onClick={() => setShowUpload(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm">
                            <ArrowUpTrayIcon className="w-4 h-4" /> Upload First Document
                        </button>
                    )}
                </motion.div>
            ) : (
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-gray-500">{filtered.length} document{filtered.length !== 1 ? 's' : ''}</p>
                        {(search || filterType !== 'All' || filterStatus !== 'All') && (
                            <button onClick={() => { setSearch(''); setFilterType('All'); setFilterStatus('All'); }}
                                className="text-xs font-semibold text-indigo-600 hover:underline">
                                Clear filters
                            </button>
                        )}
                    </div>
                    <div className={view === 'grid'
                        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
                        : 'space-y-3'
                    }>
                        <AnimatePresence>
                            {filtered.map(doc => (
                                <DocCard
                                    key={doc.id}
                                    doc={doc}
                                    view={view}
                                    onView={id => navigate(`/documents/${id}`)}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            )}

            {/* ── Upload Modal ─────────────────────────────────────────────── */}
            <AnimatePresence>
                {showUpload && (
                    <UploadModal
                        onClose={() => setShowUpload(false)}
                        onUpload={handleUpload}
                        uploading={uploading}
                    />
                )}
            </AnimatePresence>

            {/* ── Toast ───────────────────────────────────────────────────── */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: 20, x: '-50%' }}
                        className={`fixed bottom-8 left-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold ${
                            toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'
                        }`}
                    >
                        {toast.type === 'success'
                            ? <CheckSolid className="w-4 h-4 text-green-400 flex-shrink-0" />
                            : <ExclamationTriangleIcon className="w-4 h-4 text-red-300 flex-shrink-0" />
                        }
                        {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Documents;
