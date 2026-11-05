import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApplicationStore } from '../stores/applicationStore';
import { XMarkIcon as XIcon, ArrowDownTrayIcon as DownloadIcon, ArrowTopRightOnSquareIcon as ExternalLinkIcon, MicrophoneIcon, DocumentTextIcon, ArrowPathIcon as RefreshIcon } from '@heroicons/react/24/outline';
import Confetti from 'react-confetti';

const DiagnosisModal = () => {
  const { activeDiagnosis, clearDiagnosis } = useApplicationStore();
  const [success, setSuccess] = useState(false);

  if (!activeDiagnosis || !activeDiagnosis.diagnosis) return null;

  const { diagnosis } = activeDiagnosis;

  const handleFix = () => {
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      clearDiagnosis();
    }, 4000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        {success && <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} />}
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 50 }}
          className="bg-gradient-to-br from-gray-900 to-gray-800 border border-red-500/30 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden relative"
        >
          {/* Header */}
          <div className="bg-red-500/10 p-6 border-b border-red-500/20 flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="text-red-500">🔴</span> {activeDiagnosis.scheme} Rejection Analysis
              </h2>
              <p className="text-gray-300 mt-1">Ref: {activeDiagnosis.ref}</p>
            </div>
            <button onClick={clearDiagnosis} className="text-gray-400 hover:text-white bg-white/5 p-2 rounded-full transition-all">
              <XIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-200 border-b border-white/10 pb-2">AI Diagnosis</h3>
              <ul className="space-y-2">
                {diagnosis.missing.map((item, i) => (
                  <li key={i} className="flex gap-2 text-red-200 items-start">
                    <span className="shrink-0 mt-0.5">❌</span> Missing: {item}
                  </li>
                ))}
                {diagnosis.check.map((item, i) => (
                  <li key={i} className="flex gap-2 text-yellow-200 items-start">
                    <span className="shrink-0 mt-0.5">⚠️</span> Check: {item}
                  </li>
                ))}
                {diagnosis.ok.map((item, i) => (
                  <li key={i} className="flex gap-2 text-green-200 items-start">
                    <span className="shrink-0 mt-0.5">✅</span> OK: {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
              <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                <h3 className="text-lg font-semibold text-saffron">Fix Kit</h3>
                <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded text-xs font-bold border border-green-500/30">92% Confidence</span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <button className="btn-secondary text-sm px-3 py-2 h-auto"><DownloadIcon className="w-4 h-4"/> Format</button>
                <button className="btn-secondary text-sm px-3 py-2 h-auto"><ExternalLinkIcon className="w-4 h-4"/> Portal</button>
                <button className="btn-secondary text-sm px-3 py-2 h-auto"><MicrophoneIcon className="w-4 h-4"/> Voice [HI]</button>
                <button className="btn-secondary text-sm px-3 py-2 h-auto col-span-2 md:col-span-1"><DocumentTextIcon className="w-4 h-4"/> Draft RTI</button>
              </div>

              <div className="mt-4 flex gap-3">
                <button onClick={handleFix} className="btn-primary flex-1 bg-green-600 hover:bg-green-500 py-3">
                  <RefreshIcon className="w-5 h-5"/> Reapply Now
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DiagnosisModal;
