import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../stores/userStore';
import { useApplicationStore } from '../stores/applicationStore';
import GlassCard from '../components/GlassCard';
import StatusPill from '../components/StatusPill';
import { MapPinIcon as LocationMarkerIcon, PhoneIcon, IdentificationIcon, CheckCircleIcon, XCircleIcon, ExclamationCircleIcon as ExclamationIcon, DocumentTextIcon, ChatBubbleLeftRightIcon as ChatAlt2Icon, MicrophoneIcon, SparklesIcon, CalendarIcon, UserIcon } from '@heroicons/react/24/outline';

const Dashboard = () => {
  const { user: authUser } = useAuthStore();
  
  // Map Supabase auth user to Dashboard's expected format with safe fallbacks
  const user = {
      name: authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || authUser?.email?.split('@')[0] || 'User',
      mobile: authUser?.user_metadata?.phone || '+91 98765 43210',
      location: 'Maharashtra',
      locale: 'en',
      income: 250000,
      family: 4,
      caste: 'General',
      bplEligible: false
  };

  const { applications, recommendations, setActiveDiagnosis } = useApplicationStore();
  const [personalOpen, setPersonalOpen] = useState(true);
  
  const getDocIcon = (status) => {
    switch(status) {
      case 'valid': return <CheckCircleIcon className="w-5 h-5 text-success" />;
      case 'pending': return <XCircleIcon className="w-5 h-5 text-brand-accent" />;
      case 'expired': return <ExclamationIcon className="w-5 h-5 text-amber-500" />;
      default: return <IdentificationIcon className="w-5 h-5 text-text-secondary" />;
    }
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 h-full">
      {/* LEFT COLUMN: Profile */}
      <div className="lg:col-span-3 space-y-8 order-2 lg:order-1">
        <GlassCard className="lg:sticky lg:top-28 relative overflow-hidden p-8 border-white/60 shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent animate-mesh-gradient"></div>
          
          <div className="flex flex-col items-center text-center mb-8 pt-4">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-brand-primary to-brand-secondary text-white flex justify-center items-center text-4xl font-black shadow-2xl shadow-brand-primary/30 mb-4 rotate-3 hover:rotate-0 transition-transform duration-500">
              {user.name.charAt(0)}
            </div>
            <h2 className="text-2xl font-black font-hindi text-text-main">{user.name}</h2>
            <div className="flex items-center gap-2 text-sm text-text-secondary font-bold mt-1">
              <PhoneIcon className="w-4 h-4 text-brand-primary" /> {user.mobile}
            </div>
          </div>
          
          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 text-sm text-text-secondary font-medium bg-brand-primary/5 p-3 rounded-2xl border border-brand-primary/10">
              <LocationMarkerIcon className="w-5 h-5 text-brand-primary" />
              <span>{user.location} • {user.locale === 'hi' ? 'Hindi' : 'English'}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-brand-secondary/5 p-3 rounded-2xl border border-brand-secondary/10 flex flex-col items-center">
                <span className="text-[10px] uppercase tracking-widest text-text-secondary font-black mb-1">Apps</span>
                <strong className="text-xl font-black text-text-main">07</strong>
              </div>
              <div className="bg-success/5 p-3 rounded-2xl border border-success/10 flex flex-col items-center">
                <span className="text-[10px] uppercase tracking-widest text-text-secondary font-black mb-1">Success</span>
                <strong className="text-xl font-black text-success">71%</strong>
              </div>
            </div>
          </div>
          
          <div className="border-t border-brand-primary/10 pt-6">
            <button 
              onClick={() => setPersonalOpen(!personalOpen)}
              className="w-full flex justify-between items-center group mb-4"
            >
              <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2 text-text-main italic">
                <UserIcon className="w-5 h-5 text-brand-primary" />
                Personal Data
              </h3>
              <span className={`transition-transform duration-500 text-brand-primary ${personalOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>
            <AnimatePresence>
              {personalOpen && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-5 overflow-hidden"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px] font-black uppercase tracking-tighter text-text-secondary">
                      <span>Annual Income</span>
                      <span className="text-brand-primary">₹{(user.income / 100000).toFixed(1)}L</span>
                    </div>
                    <div className="h-2 w-full bg-brand-primary/5 rounded-full overflow-hidden border border-brand-primary/10">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(user.income / 1000000) * 100}%` }}
                        className="h-full bg-gradient-to-r from-brand-primary to-brand-secondary"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-brand-primary/10 text-brand-primary px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border border-brand-primary/20">Family: {user.family}</span>
                    <span className="bg-brand-secondary/10 text-brand-secondary px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border border-brand-secondary/20">Caste: {user.caste}</span>
                  </div>
                  <div className="flex gap-2">
                    {user.bplEligible && <span className="bg-success/10 text-success px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border border-success/30 ring-4 ring-success/5 animate-pulse-slow">BPL Holder</span>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </GlassCard>
      </div>

      {/* MIDDLE COLUMN: Applications */}
      <div className="lg:col-span-6 space-y-8 order-1 lg:order-2">
        <header className="flex justify-between items-end mb-4">
          <div>
            <h2 className="text-4xl font-black text-text-main tracking-tight italic">Tracker</h2>
            <p className="text-text-secondary font-medium">Monitoring your active applications</p>
          </div>
          <button className="text-brand-primary font-black text-sm uppercase tracking-widest hover:underline decoration-2 underline-offset-4">View All</button>
        </header>
        
        <div className="space-y-6">
          {applications.map((app, index) => (
            <GlassCard key={app.id} className="p-8 border-white/80 group overflow-hidden" hover>
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-4">
                    <h3 className="text-2xl font-black text-text-main tracking-tight group-hover:text-brand-primary transition-colors">{app.scheme}</h3>
                    <StatusPill status={app.status} />
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold text-text-secondary">
                    <span className="bg-text-main/5 px-2 py-1 rounded-md font-mono">{app.ref}</span>
                    <span className="flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5"/> {app.date}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3 mb-8">
                <div className="flex justify-between items-end">
                  <span className="text-[11px] font-black uppercase tracking-widest text-text-secondary italic">Verification Pipeline</span>
                  <span className="text-xl font-black text-text-main">{app.progress}%</span>
                </div>
                <div className="h-3 w-full bg-brand-primary/5 rounded-full overflow-hidden border border-brand-primary/5 p-0.5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${app.progress}%` }}
                    transition={{ duration: 1.5, delay: index * 0.2, ease: "circOut" }}
                    className={`h-full rounded-full shadow-lg ${
                      app.status === 'rejected' ? 'bg-brand-accent' : 
                      app.status === 'approved' ? 'bg-success' : 'bg-gradient-to-r from-brand-primary to-brand-secondary'
                    }`}
                  />
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4">
                {app.status === 'rejected' ? (
                  <>
                    <button onClick={() => setActiveDiagnosis(app.id)} className="btn-primary py-3 px-6 text-sm bg-brand-accent shadow-brand-accent/30 from-brand-accent to-brand-accent hover:shadow-brand-accent/50">
                      Diagnose Error
                    </button>
                    <button className="btn-secondary py-3 px-6 text-sm">Resubmit File</button>
                  </>
                ) : app.status === 'pending' ? (
                  <button className="btn-secondary py-3 px-6 text-sm border-brand-primary/20 text-brand-primary font-black">Expedite Process</button>
                ) : (
                  <button className="btn-primary py-3 px-6 text-sm bg-success from-success to-emerald-500 shadow-success/30 hover:shadow-success/50">Download Certificate</button>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* RIGHT COLUMN: Insights */}
      <div className="lg:col-span-3 space-y-8">
        <GlassCard className="p-8 border-white animate-fade-in-up">
          <h3 className="text-xl font-black text-text-main tracking-tight mb-6 flex items-center gap-2">
            <SparklesIcon className="w-6 h-6 text-brand-primary" />
            Best Matches
          </h3>
          <div className="space-y-4">
            {recommendations.map((rec, i) => (
              <div key={i} className="group cursor-pointer p-4 rounded-2xl bg-brand-primary/[0.02] border border-brand-primary/5 hover:bg-brand-primary/5 hover:border-brand-primary/20 transition-all duration-300">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-text-main group-hover:text-brand-primary transition-colors">{rec.scheme}</span>
                  <span className="text-[10px] font-black text-success bg-success/10 px-2 py-1 rounded-lg ring-1 ring-success/20">{rec.match}%</span>
                </div>
                <div className="h-1 w-full bg-brand-primary/5 rounded-full overflow-hidden">
                  <div className="h-full bg-success/40 w-[70%]" style={{ width: `${rec.match}%` }} />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-8 border-white bg-gradient-to-br from-brand-primary/5 to-brand-secondary/5 border-brand-primary/10">
          <h3 className="text-xl font-black text-text-main tracking-tight mb-6 flex items-center gap-2">
            <ChatAlt2Icon className="w-6 h-6 text-brand-secondary" />
            Saarthi Brain
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <button className="p-4 rounded-2xl bg-white border border-brand-primary/10 shadow-sm hover:shadow-md hover:scale-[1.05] transition-all flex flex-col items-center gap-2">
              <MicrophoneIcon className="w-6 h-6 text-brand-primary" />
              <span className="text-[10px] font-black uppercase text-text-secondary">Talk</span>
            </button>
            <button className="p-4 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#8B5CF6] col-span-2 text-white shadow-lg shadow-indigo-500/30 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 font-black text-[11px] uppercase tracking-widest mt-2 py-4">
              <SparklesIcon className="w-5 h-5" />
              Predict Eligibility
            </button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default Dashboard;
