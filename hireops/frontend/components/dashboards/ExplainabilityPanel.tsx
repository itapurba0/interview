"use client";

import { motion, Variants } from "framer-motion";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.1 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 30, filter: "blur(5px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { ease: [0.22, 1, 0.36, 1], duration: 0.7 } },
};

export interface ExplainabilityData {
  ai_match_score: number;
  ai_feedback: string;
  bias_fairness_indicator: {
    status: string;
    confidence_score: number;
    sentiment: string;
  };
  assessment: {
    mcq_score: number;
    coding_score: number;
    proctoring_flags: number;
    skills_radar: any[];
  };
}

export default function ExplainabilityPanel({ data }: { data: ExplainabilityData }) {
  if (!data) return null;

  return (
    <motion.div initial="hidden" animate="show" variants={containerVariants} className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      
      {/* Visual Analytics Hub */}
      <motion.div variants={cardVariants} className="col-span-1 bg-neutral-900/40 border border-neutral-800/50 rounded-[2.5rem] p-10 shadow-2xl backdrop-blur-2xl flex flex-col items-center">
        <h3 className="text-2xl text-neutral-100 font-light mb-1 w-full text-left tracking-tight">Skills Topology</h3>
        <p className="text-neutral-500 text-[10px] font-bold tracking-[0.2em] uppercase mb-10 w-full text-left">AI vs Required Baseline Vector</p>
        
        <div className="w-full h-[320px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data.assessment.skills_radar}>
              <PolarGrid stroke="#3f3f46" strokeDasharray="3 3" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10, letterSpacing: '0.1em', fontWeight: 600 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar 
                name="Candidate Topology" 
                dataKey="A" 
                stroke="#6366f1" 
                strokeWidth={3}
                fill="#6366f1" 
                fillOpacity={0.25} 
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Aggregated Raw Metrics */}
        <div className="w-full flex justify-between items-center mt-6 pt-8 border-t border-neutral-800/40">
           <div className="text-center">
             <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-1">MCQ Phase</p>
             <p className="text-2xl text-neutral-200 font-light tracking-tight">{data.assessment.mcq_score}%</p>
           </div>
           <div className="text-center">
             <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-1">Code Core</p>
             <p className="text-2xl text-emerald-400 font-light tracking-tight shadow-emerald-400">{data.assessment.coding_score}%</p>
           </div>
           <div className="text-center">
             <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-1">Vision Anomalies</p>
             <p className={`text-2xl font-light tracking-tight ${data.assessment.proctoring_flags > 0 ? 'text-red-400' : 'text-neutral-200'}`}>
               {data.assessment.proctoring_flags}
             </p>
           </div>
        </div>
      </motion.div>

      {/* Intelligence & Explanatory Reasoning Matrix */}
      <motion.div variants={cardVariants} className="col-span-1 xl:col-span-2 flex flex-col gap-8">
        
        {/* Fairness Algorithm Indicator */}
        <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-[2.5rem] p-10 shadow-2xl backdrop-blur-2xl flex items-center justify-between group overflow-hidden relative">
            <div className="absolute top-0 right-10 w-48 h-48 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />
            
            <div className="z-10">
              <h3 className="text-2xl text-neutral-100 font-light mb-2 tracking-tight">AI Audit: Output Bias & Fairness</h3>
              <p className="text-neutral-400 text-sm font-light tracking-wide">Algorithmic independence evaluation ensures objective evaluation structures.</p>
            </div>
            
            <div className="flex items-center gap-6 z-10">
               <div className="text-right">
                 <p className="text-emerald-400 text-sm font-bold tracking-widest uppercase mb-1">{data.bias_fairness_indicator.status}</p>
                 <p className="text-neutral-400 text-xs font-medium tracking-wide">{data.bias_fairness_indicator.sentiment}</p>
               </div>
               <div className="w-16 h-16 rounded-full border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center shadow-[0_0_30px_rgba(52,211,153,0.15)]">
                 <span className="text-emerald-400 font-bold text-sm">{(data.bias_fairness_indicator.confidence_score * 100).toFixed(0)}%</span>
               </div>
            </div>
        </div>

        {/* Neural Reasoning Sandbox Text Block */}
        <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-[2.5rem] p-10 shadow-2xl backdrop-blur-2xl flex-1 flex flex-col group relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500/50 via-purple-500/50 to-emerald-500/50"></div>
          
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-2xl text-neutral-100 font-light tracking-tight">Agentic Reasoning Core</h3>
            <span className="px-5 py-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-full text-xs font-bold tracking-[0.2em] shadow-[0_0_20px_rgba(99,102,241,0.1)]">
              TOTAL MATCH: {data.ai_match_score}%
            </span>
          </div>
          
          <div className="flex-1 bg-neutral-950/60 border border-neutral-800/60 rounded-[1.5rem] p-8 shadow-inner relative overflow-hidden">
            {/* Ambient inner glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-indigo-500/5 rounded-full blur-[80px]"></div>
            
            <p className="text-neutral-300 font-light leading-loose tracking-wide text-lg relative z-10">
              <span className="text-indigo-400 font-bold tracking-widest text-[10px] uppercase block mb-4">Core Vector Analysis</span>
              {data.ai_feedback}
            </p>
          </div>
        </div>

      </motion.div>
    </motion.div>
  );
}
