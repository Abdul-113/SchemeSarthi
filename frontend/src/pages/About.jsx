import React from 'react';
import { BuildingLibraryIcon, CodeBracketIcon, SparklesIcon, HeartIcon } from '@heroicons/react/24/solid';
import GlassCard from '../components/GlassCard';

const About = () => {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 animate-in fade-in duration-500 space-y-8">
      
      <div className="flex items-center gap-4 mb-4">
        <BuildingLibraryIcon className="w-12 h-12 text-saffron" />
        <div>
          <h1 className="text-3xl font-bold">About Scheme Saarthi</h1>
          <p className="text-blue-200 text-sm mt-1">Bridging the gap between Indian Citizens and Government Benefits.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard className="p-8 border-t-4 border-t-saffron">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <SparklesIcon className="w-6 h-6 text-saffron" /> The Problem
          </h2>
          <p className="text-gray-300 leading-relaxed mb-4">
            India has hundreds of welfare schemes designed to uplift citizens, but navigating the eligibility criteria, understanding the required documents, and dealing with application rejections is a massive hurdle for those who need these benefits the most.
          </p>
          <p className="text-gray-300 leading-relaxed">
            Language barriers, complex bureaucratic terminology, and lack of personalized guidance lead to high abandonment and rejection rates.
          </p>
        </GlassCard>

        <GlassCard className="p-8 border-t-4 border-t-blue">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <HeartIcon className="w-6 h-6 text-blue-400" /> Our Solution
          </h2>
          <p className="text-gray-300 leading-relaxed mb-4">
            Scheme Saarthi acts as a digital companion (Saarthi). It uses advanced AI to translate complex government rules into simple, conversational interactions.
          </p>
          <p className="text-gray-300 leading-relaxed">
            Citizens can simply upload their documents, share their profile, and chat in their native language to instantly discover what they are eligible for, and exactly how to fix rejected applications.
          </p>
        </GlassCard>
      </div>

    </div>
  );
};

export default About;
