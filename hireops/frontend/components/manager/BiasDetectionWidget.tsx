"use client";

import { motion, Variants } from "framer-motion";
import { ShieldAlert, AlertTriangle, ShieldCheck } from "lucide-react";

const widgetVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, filter: "blur(6px)" },
  show: { opacity: 1, scale: 1, filter: "blur(0px)", transition: { ease: [0.22, 1, 0.36, 1], duration: 0.8 } },
};

interface BiasIndicator {
  status: string;
  confidence_score: number;
  sentiment: string;
}

interface BiasDetectionWidgetProps {
  proctoringFlags: number;
  biasIndicator: BiasIndicator;
  mcqScore: number;
  codingScore: number;
}

export function BiasDetectionWidget({
  proctoringFlags,
  biasIndicator,
  mcqScore,
  codingScore,
}: BiasDetectionWidgetProps) {
  return (
    <motion.div variants={widgetVariants} className="flex flex-col gap-8">
      {/* Fairness Algorithm Indicator */}
      <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-[2.5rem] p-10 shadow-2xl backdrop-blur-2xl flex items-center justify-between group overflow-hidden relative">
        <div className="absolute top-0 right-10 w-48 h-48 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
        
        <div className="z-10">
          <h3 className="text-2xl text-neutral-100 font-light mb-2 tracking-tight">AI Audit: Output Bias & Fairness</h3>
          <p className="text-neutral-400 text-sm font-light tracking-wide">Algorithmic independence evaluation ensures objective evaluation structures.</p>
        </div>
        
        <div className="flex items-center gap-6 z-10">
          <div className="text-right">
            <p className="text-emerald-400 text-sm font-bold tracking-widest uppercase mb-1">{biasIndicator.status}</p>
            <p className="text-neutral-400 text-xs font-medium tracking-wide">{biasIndicator.sentiment}</p>
          </div>
          <div className="w-16 h-16 rounded-full border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center shadow-[0_0_30px_rgba(52,211,153,0.15)]">
            <span className="text-emerald-400 font-bold text-sm">{(biasIndicator.confidence_score * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Aggregated Raw Metrics */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-[2.5rem] p-8 shadow-2xl backdrop-blur-2xl text-center">
          <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-2">MCQ Phase</p>
          <p className="text-3xl text-neutral-200 font-light tracking-tight">{mcqScore}%</p>
        </div>
        <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-[2.5rem] p-8 shadow-2xl backdrop-blur-2xl text-center">
          <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-2">Code Core</p>
          <p className="text-3xl text-emerald-400 font-light tracking-tight">{codingScore}%</p>
        </div>
        <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-[2.5rem] p-8 shadow-2xl backdrop-blur-2xl text-center flex flex-col items-center justify-center relative overflow-hidden group">
          {proctoringFlags > 0 && <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none" />}
          <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-2 relative z-10">Vision Anomalies</p>
          <div className="flex items-center gap-3 relative z-10">
             {proctoringFlags > 0 ? <AlertTriangle className="w-5 h-5 text-red-400" /> : <ShieldCheck className="w-5 h-5 text-emerald-400" />}
             <p className={`text-3xl font-light tracking-tight ${proctoringFlags > 0 ? 'text-red-400' : 'text-neutral-200'}`}>
               {proctoringFlags}
             </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
