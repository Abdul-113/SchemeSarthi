import React, { useState } from 'react';
import { motion } from 'framer-motion';
import GlassCard from '../components/GlassCard';
import { CameraIcon, ArrowUpTrayIcon as UploadIcon, DocumentCheckIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

const Upload = () => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);

  const handleScan = () => {
    setScanning(true);
    setResult(null);
    setTimeout(() => {
      setScanning(false);
      setResult({ aadhar: 'Valid ✓', income: 'Expired ✗', confidence: 98 });
    }, 2500);
  };

  return (
    <div className="max-w-3xl mx-auto h-[80vh] flex flex-col justify-center">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Document Scanner</h1>
        <p className="text-slate-500 font-medium">Upload or snap a photo of your documents for instant AI validation.</p>
      </div>

      <GlassCard className="p-8 text-center relative overflow-hidden">
        {/* Drag and drop zone */}
        <div 
          onClick={handleScan}
          className={`border-2 border-dashed rounded-2xl p-12 transition-all cursor-pointer ${
            scanning ? 'border-indigo-500 bg-indigo-50/80' : 'border-indigo-200 hover:bg-indigo-50/50 hover:border-indigo-300'
          }`}
        >
          {scanning ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 border-t-4 border-indigo-600 rounded-full animate-spin"></div>
                <DocumentTextIcon className="w-10 h-10 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              <p className="text-lg font-semibold text-indigo-600 font-mono">Running OCR Analysis...</p>
            </div>
          ) : result ? (
            <div className="space-y-6">
              <DocumentCheckIcon className="w-20 h-20 text-success mx-auto" />
              <div className="bg-white/60 border border-slate-200/60 shadow-sm p-4 rounded-xl inline-block text-left">
                <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-2">Scan Results:</h3>
                <p className="text-emerald-600 font-mono font-medium">Aadhar: {result.aadhar}</p>
                <p className="text-rose-500 font-mono font-medium">Income Cert: {result.income}</p>
                <div className="text-xs text-slate-500 mt-2 font-medium">AI Confidence: {result.confidence}%</div>
              </div>
              <div>
                <button className="btn-secondary mt-4 w-full md:w-auto" onClick={(e) => { e.stopPropagation(); setResult(null); }}>
                  Scan Another Document
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <UploadIcon className="w-16 h-16 text-indigo-300 mx-auto" />
              <div className="text-lg font-semibold text-slate-700">Drag & Drop files here</div>
              <div className="text-sm text-slate-500 font-medium">or click to browse from device</div>
              <div className="flex justify-center mt-6">
                <button className="btn-primary px-8">
                  <CameraIcon className="w-6 h-6" /> Open Camera
                </button>
              </div>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
};

export default Upload;
