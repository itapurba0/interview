"use client";

import { motion, Variants } from "framer-motion";
import { User, Mail, Sparkles } from "lucide-react";

const widgetVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, filter: "blur(6px)" },
  show: { opacity: 1, scale: 1, filter: "blur(0px)", transition: { ease: [0.22, 1, 0.36, 1], duration: 0.8 } },
};

interface CandidateInsightsCardProps {
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  matchScore: number;
  feedback: string;
}

export function CandidateInsightsCard({
  candidateName,
  candidateEmail,
  jobTitle,
  matchScore,
  feedback,
}: CandidateInsightsCardProps) {
  return (
    <motion.div variants={widgetVariants} className="bg-neutral-900/40 border border-neutral-800/50 rounded-[2.5rem] p-10 shadow-2xl backdrop-blur-2xl flex flex-col group relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500/50 via-purple-500/50 to-emerald-500/50" />
      
      {/* Candidate Profile Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-[2rem] bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-2xl shadow-[0_0_30px_rgba(99,102,241,0.15)]">
            {candidateName.charAt(0)}
          </div>
          <div>
            <h3 className="text-3xl text-neutral-100 font-light tracking-tight">{candidateName}</h3>
            <div className="flex items-center gap-4 mt-2">
              <span className="flex items-center gap-2 text-neutral-500 text-sm">
                <Mail className="w-3.5 h-3.5" />
                {candidateEmail}
              </span>
              <span className="text-neutral-700">•</span>
              <span className="flex items-center gap-2 text-indigo-400/80 text-sm font-medium">
                Applied for {jobTitle}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-end">
          <span className="px-6 py-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-full text-xs font-bold tracking-[0.2em] shadow-[0_0_20px_rgba(99,102,241,0.1)] flex items-center gap-2">
            <Sparkles className="w-3 h-3" />
            TOTAL MATCH: {matchScore}%
          </span>
        </div>
      </div>

      <h3 className="text-2xl text-neutral-100 font-light tracking-tight mb-8">Agentic Reasoning Core</h3>
      
      <div className="flex-1 bg-neutral-950/60 border border-neutral-800/60 rounded-[2rem] p-10 shadow-inner relative overflow-hidden group/text">
        {/* Ambient inner glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none group-hover/text:bg-indigo-500/10 transition-colors" />
        
        <div className="relative z-10">
          <span className="text-indigo-400 font-bold tracking-widest text-[10px] uppercase block mb-6 px-3 py-1 bg-indigo-500/5 border border-indigo-500/20 rounded-md w-fit">Core Vector Analysis</span>
          <p className="text-neutral-300 font-light leading-loose tracking-wide text-xl indent-8">
            {feedback}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
