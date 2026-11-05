import React from 'react';

const StatusPill = ({ status }) => {
  const getStatusConfig = () => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'valid':
        return { text: 'bg-success/5 text-success border-success/20', dot: 'bg-success', label: status };
      case 'rejected':
      case 'expired':
        return { text: 'bg-[#F43F5E]/5 text-[#F43F5E] border-[#F43F5E]/20', dot: 'bg-[#F43F5E]', label: status };
      case 'pending':
        return { text: 'bg-amber-500/5 text-[#B45309] border-amber-500/20', dot: 'bg-amber-500', label: status };
      default:
        return { text: 'bg-[#64748B]/5 text-[#64748B] border-[#64748B]/20', dot: 'bg-[#64748B]', label: status };
    }
  };

  const config = getStatusConfig();

  return (
    <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] ${config.text} border shadow-sm`}>
      <span className={`w-2 h-2 rounded-full ${config.dot} shadow-[0_0_10px_rgba(0,0,0,0.1)]`}></span>
      <span>{config.label}</span>
    </span>
  );
};

export default StatusPill;
