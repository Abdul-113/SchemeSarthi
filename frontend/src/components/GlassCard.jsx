import React from 'react';
import { motion } from 'framer-motion';

const GlassCard = ({ children, className = '', hover = false, onClick }) => {
  return (
    <motion.div
      onClick={onClick}
      whileTap={onClick ? { scale: 0.98 } : {}}
      className={`glass-card ${hover ? 'glass-card-hover cursor-pointer p-8' : 'p-6'} ${className}`}
    >
      {children}
    </motion.div>
  );
};

export default GlassCard;
