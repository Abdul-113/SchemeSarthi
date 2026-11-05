import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MicrophoneIcon, MagnifyingGlassIcon as SearchIcon, SparklesIcon, ShieldCheckIcon, DocumentMagnifyingGlassIcon as DocumentSearchIcon, ArrowRightIcon, PlayIcon, BoltIcon } from '@heroicons/react/24/outline';
import GlassCard from '../components/GlassCard';

const Home = () => {
  const navigate = useNavigate();

  const features = [
    { title: 'Check Eligibility', icon: SparklesIcon, color: 'from-blue-500 to-brand-primary', path: '/eligibility', desc: 'Find schemes you qualify for in minutes' },
    { title: 'Rejection Analysis', icon: ShieldCheckIcon, color: 'from-brand-accent to-orange-500', path: '/chat', desc: 'Understand why applications get rejected' },
    { title: 'Document Vault', icon: DocumentSearchIcon, color: 'from-brand-secondary to-indigo-500', path: '/documents', desc: 'Securely manage your scheme documents' },
    { title: 'AI Assistant', icon: MicrophoneIcon, color: 'from-amber-400 to-orange-500', path: '/chat', desc: 'Talk to Saarthi for any scheme help' },
  ];

  return (
    <div className="relative flex flex-col items-center justify-center min-h-[80vh] text-center px-6 overflow-hidden">
      
      {/* Background Accent Glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-primary/10 rounded-full blur-[120px] -z-10 animate-mesh-gradient"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-secondary/10 rounded-full blur-[100px] -z-10 animate-mesh-gradient" style={{ animationDelay: '2s' }}></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="w-full max-w-5xl"
      >
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-primary/5 border border-brand-primary/10 text-brand-primary text-xs font-black uppercase tracking-[0.2em] mb-8 shadow-sm"
        >
          <BoltIcon className="w-4 h-4" />
          Powered by Advanced AI
        </motion.div>

        <h1 className="text-7xl md:text-9xl font-black mb-8 tracking-tighter leading-[0.9] text-text-main">
          Navigate <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent">Scheme Benefits</span>
        </h1>
        
        <p className="max-w-3xl mx-auto text-xl md:text-2xl text-text-secondary mb-14 leading-relaxed font-medium">
          Your intelligent companion for Indian Government Schemes.
          <span className="block mt-2 text-text-main/60 italic font-normal text-lg">Fast, Secure, and Built for You.</span>
        </p>

        <div className="flex flex-col sm:flex-row gap-8 justify-center mb-32">
          <button
            onClick={() => navigate('/chat')}
            className="btn-primary text-xl px-12 py-5 group overflow-hidden relative"
          >
            <span className="relative z-10 flex items-center gap-3">
              Explore Now
              <ArrowRightIcon className="w-6 h-6 transition-transform group-hover:translate-x-2" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          </button>
          
          <button
            onClick={() => navigate('/documents')}
            className="btn-secondary text-xl px-12 py-5 hover:bg-brand-primary hover:text-white transition-all duration-300"
          >
            <PlayIcon className="w-6 h-6" />
            Watch Demo
          </button>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1, duration: 0.8 }}
              className="h-full"
            >
              <GlassCard 
                className="flex flex-col items-center p-10 gap-6 cursor-pointer h-full border-white/60 group hover:border-brand-primary/30 transition-all duration-500 relative overflow-hidden" 
                onClick={() => navigate(feature.path)}
                hover
              >
                {/* Internal Card Glow */}
                <div className={`absolute -top-12 -right-12 w-24 h-24 bg-gradient-to-br ${feature.color} blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500`}></div>
                
                <div className={`p-5 rounded-2xl bg-gradient-to-br ${feature.color} shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-brand-primary/20`}>
                  <feature.icon className="w-10 h-10 text-white" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-black text-xl text-text-main tracking-tight">{feature.title}</h3>
                  <p className="text-sm text-text-secondary font-medium leading-relaxed">{feature.desc}</p>
                </div>

                <div className="mt-auto w-10 h-1 bg-brand-primary/10 rounded-full group-hover:w-full transition-all duration-500"></div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Home;
