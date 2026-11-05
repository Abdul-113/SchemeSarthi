import React, { useState, useRef } from 'react';
import { ShieldExclamationIcon, CheckCircleIcon, ExclamationTriangleIcon, DocumentArrowUpIcon, TrashIcon, XCircleIcon, InformationCircleIcon, DocumentIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';
import Select from 'react-select';
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from 'recharts';
import { analyzeRisk } from '../api/api';
import { useTranslation } from 'react-i18next';

// Standard Scheme Options derived from the backend
const SCHEME_OPTIONS = [
  { value: "PMAY Urban", label: "Pradhan Mantri Awas Yojana (Urban)" },
  { value: "PMAY Gramin", label: "Pradhan Mantri Awas Yojana (Gramin)" },
  { value: "PM Kisan", label: "PM Kisan Samman Nidhi" },
  { value: "Kisan Credit Card", label: "Kisan Credit Card (KCC)" },
  { value: "PM Fasal Bima", label: "Pradhan Mantri Fasal Bima Yojana" },
  { value: "PMJAY Ayushman", label: "Ayushman Bharat PMJAY" },
  { value: "SC Scholarship PostMatric", label: "Post Matric Scholarship for SC" },
  { value: "ST Scholarship PostMatric", label: "Post Matric Scholarship for ST" },
  { value: "OBC Scholarship PreMatric", label: "Pre Matric Scholarship for OBC" },
  { value: "NSP Merit Scholarship", label: "National Means cum Merit Scholarship" },
  { value: "Mahadbt Scholarship", label: "MahaDBT Scholarship" },
  { value: "Mudra Shishu", label: "Mudra Yojana (Shishu)" },
  { value: "Mudra Kishore", label: "Mudra Yojana (Kishore)" },
  { value: "StandUp India", label: "Stand-Up India" },
  { value: "PM SVANidhi", label: "PM SVANidhi" },
  { value: "PMMVY", label: "Pradhan Mantri Matru Vandana Yojana" },
  { value: "Sukanya Samriddhi", label: "Sukanya Samriddhi Yojana" },
  { value: "PM Ujjwala", label: "Pradhan Mantri Ujjwala Yojana" },
  { value: "Beti Bachao Beti Padhao", label: "Beti Bachao Beti Padhao" },
  { value: "NHFDC Loan", label: "NHFDC Loan for Persons with Disabilities" },
  { value: "DISHA Scholarship", label: "DISHA Scholarship for PwD" },
  { value: "PMVVY Pension", label: "Pradhan Mantri Vaya Vandana Yojana" },
  { value: "IGNOAPS Pension", label: "Indira Gandhi National Old Age Pension" },
  { value: "Ladki Bahin Yojana", label: "Mukhyamantri Majhi Ladki Bahin Yojana" }
];

const STATES = [
  "Select State", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", 
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", 
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", 
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", 
  "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

const CATEGORIES = [
  "Select Category", "General", "OBC", "SC", "ST", "Minority", "EWS"
];

const GENDERS = [
  "Select Gender", "Male", "Female", "Other"
];

const RiskCheck = () => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    schemeName: null, // React-Select value object
    state: 'Select State',
    income: '',
    category: 'Select Category',
    age: '',
    gender: 'Select Gender'
  });
  
  const [files, setFiles] = useState([]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (selectedOption) => {
    setFormData({ ...formData, schemeName: selectedOption });
  };

  const handleFileSelect = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.schemeName || formData.state === 'Select State' || formData.category === 'Select Category' || !formData.income || !formData.age || formData.gender === 'Select Gender') {
      setError("Please fill out all required fields.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const data = await analyzeRisk({
        schemeName: formData.schemeName.label, // Use the human-readable label
        state: formData.state,
        income: formData.income,
        category: formData.category,
        age: formData.age,
        gender: formData.gender,
        files: files
      });
      setResult(data);
      // Smooth scroll to results
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }, 100);
    } catch (err) {
      setError(err.message || "Failed to analyze risk.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsLoading(false);
    }
  };

  // Recharts Gauge Data preparation
  const getGaugeData = (score) => {
    return [
      { name: 'Score', value: score, fill: getRiskColorCode(score) },
      { name: 'Remaining', value: 100 - score, fill: '#E5E7EB' } // Tailwind gray-200
    ];
  };

  const getRiskColorCode = (score) => {
    if (score < 30) return '#10B981'; // Green
    if (score < 70) return '#F59E0B'; // Amber
    return '#EF4444'; // Red
  };

  const getRiskTextClass = (level) => {
    switch (level?.toUpperCase()) {
      case 'HIGH': return 'text-red-600';
      case 'MEDIUM': return 'text-amber-500';
      case 'LOW': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getRiskBadgeClass = (level) => {
    switch (level?.toUpperCase()) {
      case 'HIGH': return 'bg-red-100 text-red-700 border-red-200';
      case 'MEDIUM': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'LOW': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // React-Select custom styles to match our clean UI
  const selectStyles = {
    control: (base, state) => ({
      ...base,
      backgroundColor: '#F9FAFB', // gray-50
      borderColor: state.isFocused ? '#6366F1' : '#E5E7EB', // indigo-500 or gray-200
      boxShadow: state.isFocused ? '0 0 0 1px #6366F1' : 'none',
      '&:hover': {
        borderColor: '#6366F1'
      },
      padding: '0.375rem',
      borderRadius: '0.75rem', // rounded-xl
    }),
    menu: (base) => ({
      ...base,
      borderRadius: '0.75rem',
      overflow: 'hidden',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected ? '#4F46E5' : state.isFocused ? '#EEF2FF' : 'white',
      color: state.isSelected ? 'white' : '#1F2937',
      cursor: 'pointer',
    })
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="text-center space-y-4 pt-6 pb-2">
        <div className="inline-flex items-center justify-center p-4 bg-indigo-50 rounded-2xl shadow-sm border border-indigo-100">
          <ShieldExclamationIcon className="w-10 h-10 text-indigo-600" />
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 flex flex-col items-center gap-2">
          <span>Application <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Risk Check</span></span>
        </h1>
        <p className="text-base text-gray-500 max-w-2xl mx-auto px-4 font-medium">
          Powered by AI Document Analysis. Calculate your rejection probability and identify missing requirements before officially applying for a scheme.
        </p>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 text-red-600 p-4 rounded-2xl border border-red-200 text-sm flex items-center gap-3 shadow-sm mx-4 sm:mx-0">
          <XCircleIcon className="w-6 h-6 flex-shrink-0" />
          <p className="font-medium">{error}</p>
        </motion.div>
      )}

      {/* Main Form Card */}
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-6 md:p-8 relative overflow-hidden mx-4 sm:mx-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-50 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <form onSubmit={handleSubmit} className="relative z-10">
          <h3 className="text-xl font-bold text-gray-900 border-b border-gray-100 pb-4 mb-6">Applicant Profile</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Scheme Name *</label>
                <Select
                  options={SCHEME_OPTIONS}
                  value={formData.schemeName}
                  onChange={handleSelectChange}
                  placeholder="Search & Select Scheme..."
                  styles={selectStyles}
                  isSearchable
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Age *</label>
                  <input 
                    type="number" 
                    name="age"
                    value={formData.age}
                    onChange={handleInputChange}
                    placeholder="e.g. 35" 
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-4 py-3 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Gender *</label>
                  <select 
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-4 py-3 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all focus:bg-white"
                  >
                    {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">State *</label>
                <select 
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-4 py-3 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all focus:bg-white"
                >
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
                  <select 
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-4 py-3 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all focus:bg-white"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Annual Income *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                    <input 
                      type="number" 
                      name="income"
                      value={formData.income}
                      onChange={handleInputChange}
                      placeholder="e.g. 250000" 
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 pl-8 pr-4 py-3 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Supporting Documents (Optional)</label>
                <div 
                  className="border-2 border-dashed border-gray-200 bg-gray-50/50 hover:bg-indigo-50/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:border-indigo-400 transition-colors cursor-pointer h-[180px] group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="w-14 h-14 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <DocumentArrowUpIcon className="w-7 h-7 text-indigo-500" />
                  </div>
                  <p className="font-bold text-gray-800 text-sm">Upload Documents</p>
                  <p className="text-xs text-gray-500 mt-1 max-w-[200px]">Upload Aadhar, Income Certificate, etc., for deeper analysis.</p>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    multiple 
                    onChange={handleFileSelect}
                    accept="image/*,.pdf"
                  />
                </div>
              </div>

              {files.length > 0 && (
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {files.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white border border-gray-100 px-4 py-3 rounded-xl text-sm shadow-sm group hover:border-indigo-100">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <DocumentIcon className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                        <span className="truncate text-gray-700 font-medium">{file.name}</span>
                      </div>
                      <button type="button" onClick={() => removeFile(idx)} className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors flex-shrink-0">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="pt-10 flex justify-end border-t border-gray-100 mt-8">
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full md:w-auto px-10 py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg shadow-gray-900/20 hover:shadow-gray-900/40 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-3 text-lg"
            >
              {isLoading ? (
                <>
                  <ArrowPathIcon className="w-6 h-6 animate-spin text-indigo-400" />
                  Analyzing Database...
                </>
              ) : (
                <>
                  <ShieldExclamationIcon className="w-6 h-6 text-indigo-400" />
                  Run AI Assessment
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Results Section */}
      <AnimatePresence>
        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="bg-white rounded-3xl shadow-[0_20px_50px_rgb(0,0,0,0.1)] border border-gray-100 p-6 md:p-10 mx-4 sm:mx-0 overflow-hidden relative"
          >
            {/* Background decoration */}
            <div className={`absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none ${
              result.score < 30 ? 'bg-green-500' : result.score < 70 ? 'bg-amber-500' : 'bg-red-500'
            }`} />

            <div className="flex flex-col lg:flex-row gap-10 items-center lg:items-start relative z-10">
              
              {/* Score Gauge Dashboard */}
              <div className="flex-shrink-0 flex flex-col items-center bg-gray-50 p-8 rounded-3xl border border-gray-100 shadow-inner w-full lg:w-auto min-w-[300px]">
                <h2 className="text-gray-500 font-bold uppercase tracking-widest text-sm mb-4">Risk Probability</h2>
                <div className="relative w-48 h-24 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getGaugeData(result.score || 0)}
                        cx="50%"
                        cy="100%"
                        startAngle={180}
                        endAngle={0}
                        innerRadius={70}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                        cornerRadius={4}
                      >
                        {getGaugeData(result.score || 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
                    <span className={`text-5xl font-black ${getRiskTextClass(result.level)}`}>{result.score}%</span>
                  </div>
                </div>
                
                <div className={`mt-4 px-6 py-2 rounded-full border font-black tracking-wide text-lg ${getRiskBadgeClass(result.level)}`}>
                  {result.level} RISK
                </div>
              </div>
              
              {/* Analysis Details */}
              <div className="flex-1 space-y-8 w-full">
                
                {/* Issues List */}
                {result.issues && result.issues.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="flex items-center gap-3 font-bold text-red-700 text-xl border-b border-red-100 pb-3">
                      <div className="p-2 bg-red-100 rounded-lg"><ExclamationTriangleIcon className="w-6 h-6" /></div>
                      Red Flags Detected
                    </h4>
                    <ul className="grid grid-cols-1 gap-3">
                      {result.issues.map((issue, idx) => (
                        <li key={idx} className="flex gap-4 items-start bg-white p-4 rounded-2xl border border-red-100 shadow-sm hover:shadow-md transition-shadow">
                          <div className="w-2 h-2 bg-red-500 rounded-full mt-2.5 flex-shrink-0" />
                          <span className="text-gray-700 font-medium leading-relaxed">{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Fixes List */}
                {result.fixes && result.fixes.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="flex items-center gap-3 font-bold text-green-700 text-xl border-b border-green-100 pb-3">
                      <div className="p-2 bg-green-100 rounded-lg"><CheckCircleIcon className="w-6 h-6" /></div>
                      Actionable Solutions
                    </h4>
                    <ul className="grid grid-cols-1 gap-3">
                      {result.fixes.map((fix, idx) => (
                        <li key={idx} className="flex gap-4 items-start bg-white p-4 rounded-2xl border border-green-100 shadow-sm hover:shadow-md transition-shadow">
                          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <CheckCircleIcon className="w-4 h-4 text-green-600" />
                          </div>
                          <span className="text-gray-700 font-medium leading-relaxed">{fix}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* No issues state */}
                {(!result.issues || result.issues.length === 0) && (
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-6 flex items-start gap-4">
                    <CheckCircleIcon className="w-8 h-8 text-green-500 flex-shrink-0" />
                    <div>
                      <h4 className="font-bold text-green-800 text-lg mb-1">Looking Good!</h4>
                      <p className="text-green-700">No major red flags were detected based on the information provided. You have a high chance of approval.</p>
                    </div>
                  </div>
                )}
                
                <div className="mt-8 pt-6 border-t border-gray-100 flex items-start gap-3 text-sm text-gray-500 font-medium bg-gray-50 p-4 rounded-xl">
                  <InformationCircleIcon className="w-6 h-6 flex-shrink-0 text-indigo-400" />
                  <p>Disclaimer: This is an AI-powered estimation based on official scheme rules. Actual approval is subject to the verifications by the respective government department.</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RiskCheck;
