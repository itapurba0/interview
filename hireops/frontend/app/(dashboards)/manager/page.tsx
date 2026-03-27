"use client";

import { motion, Variants } from "framer-motion";
import { Users, ChevronRight, BarChart3, Search } from "lucide-react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { ScoreBadge } from "@/components/ui/ScoreBadge";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const widgetVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, filter: "blur(6px)" },
  show: { 
    opacity: 1, 
    scale: 1, 
    filter: "blur(0px)", 
    transition: { 
      ease: [0.22, 1, 0.36, 1] as any, // Cast to any to bypass transition ease type issues if they persist
      duration: 0.8 
    } 
  },
};

// Mock data for the dashboard overview
const RECENT_APPLICANTS = [
  { id: 1, name: "Alex Candidate", email: "alex.candidate@example.com", job: "Senior AI Engineer", score: 92 },
  { id: 2, name: "Jordan Smith", email: "jordan.s@example.com", job: "Backend Lead", score: 85 },
  { id: 3, name: "Taylor Reed", email: "treed@example.com", job: "Fullstack Developer", score: 78 },
];

export default function ManagerDashboard() {
  return (
    <div className="flex flex-col flex-1 p-8 md:p-12 max-w-[1400px] mx-auto w-full">
      <motion.div initial="hidden" animate="show" variants={containerVariants} className="space-y-10">
        
        {/* Header */}
        <motion.div variants={widgetVariants} className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-light tracking-tight text-neutral-100">Hiring Intelligence</h1>
          <p className="text-neutral-400 text-lg font-light tracking-wide">Review AI explainability insights and candidate behavioral topology.</p>
        </motion.div>

        {/* Overview Stats */}
        <motion.div variants={widgetVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <GlassCard className="p-8 rounded-[2rem] flex flex-col gap-2">
              <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Active Review pipeline</p>
              <h4 className="text-3xl text-neutral-100 font-light tracking-tight">12 Candidates</h4>
           </GlassCard>
           <GlassCard className="p-8 rounded-[2rem] flex flex-col gap-2 border-emerald-500/20">
              <p className="text-[10px] text-emerald-500/70 font-bold uppercase tracking-widest">High Match Velocity</p>
              <h4 className="text-3xl text-emerald-400 font-light tracking-tight">4 Applicants</h4>
           </GlassCard>
           <GlassCard className="p-8 rounded-[2rem] flex flex-col gap-2 border-indigo-500/20">
              <p className="text-[10px] text-indigo-400/70 font-bold uppercase tracking-widest">Intelligence Insights</p>
              <h4 className="text-3xl text-indigo-100 font-light tracking-tight">Real-time</h4>
           </GlassCard>
        </motion.div>

        {/* Intelligence Table Placeholder */}
        <motion.div variants={widgetVariants}>
          <GlassCard className="rounded-[2.5rem] overflow-hidden">
             <div className="px-10 py-8 border-b border-neutral-800/40 flex justify-between items-center">
                <h3 className="text-xl text-neutral-100 font-light tracking-tight">Recent Decision Vectors</h3>
                <div className="relative">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                   <input 
                     type="text" 
                     placeholder="Search intelligence cache..." 
                     className="bg-neutral-950/60 border border-neutral-800 rounded-xl pl-10 pr-4 py-2 text-sm text-neutral-300 placeholder-neutral-700 focus:outline-none focus:border-indigo-500/40"
                   />
                </div>
             </div>
             
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead>
                      <tr className="border-b border-neutral-800/40 bg-neutral-900/20">
                         <th className="px-10 py-5 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Candidate</th>
                         <th className="px-10 py-5 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Position</th>
                         <th className="px-10 py-5 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Match Strength</th>
                         <th className="px-10 py-5 text-right pr-10"></th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-neutral-800/40">
                      {RECENT_APPLICANTS.map((applicant) => (
                        <tr key={applicant.id} className="group hover:bg-neutral-900/40 transition-colors">
                           <td className="px-10 py-6">
                              <p className="text-neutral-200 font-medium text-sm">{applicant.name}</p>
                              <p className="text-neutral-500 text-xs">{applicant.email}</p>
                           </td>
                           <td className="px-10 py-6">
                              <span className="px-3 py-1 bg-neutral-800/60 border border-neutral-700/40 rounded-lg text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                                {applicant.job}
                              </span>
                           </td>
                           <td className="px-10 py-6">
                              <ScoreBadge score={applicant.score} />
                           </td>
                           <td className="px-10 py-6 text-right">
                              <Link 
                                href={`/manager/application/${applicant.id}`}
                                className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg text-xs font-bold hover:bg-indigo-500/20 transition-all group/btn"
                              >
                                Review Explainability
                                <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                              </Link>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </GlassCard>
        </motion.div>

      </motion.div>
    </div>
  );
}
