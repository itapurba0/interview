"use client";

import { motion, Variants } from "framer-motion";
import { Users, ChevronRight, BarChart3, Search } from "lucide-react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { ExplainabilityRadarChart } from "@/components/manager/ExplainabilityRadarChart";

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
const RADAR_DATA = [
  { subject: "Communication", A: 86, fullMark: 100 },
  { subject: "Problem Solving", A: 92, fullMark: 100 },
  { subject: "Leadership", A: 78, fullMark: 100 },
  { subject: "Domain Fit", A: 84, fullMark: 100 },
  { subject: "Bias Risk", A: 64, fullMark: 100 },
  { subject: "Engagement", A: 88, fullMark: 100 },
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

        {/* Explainability Graph + Context */}
        <motion.div variants={widgetVariants} className="grid grid-cols-1 lg:grid-cols-[1fr_0.65fr] gap-6">
          <ExplainabilityRadarChart data={RADAR_DATA} />
          <GlassCard className="rounded-[2.5rem] p-8 flex flex-col gap-6 bg-gradient-to-br from-neutral-900/60 to-neutral-950/80 border border-neutral-800/50 shadow-2xl">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 font-bold">Explainability Focus</p>
              <h3 className="text-2xl text-neutral-100 font-light tracking-tight mt-2">Why the model scored this candidate</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-neutral-300">Confidence in topology</p>
                <span className="text-sm text-emerald-400 font-semibold">92%</span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-neutral-300">Diversity adjustment</p>
                <span className="text-sm text-amber-300 font-semibold">+3.4 pts</span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-neutral-300">Bias risk</p>
                <span className="text-sm text-red-400 font-semibold">Moderate</span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-neutral-300">Required vs observed gap</p>
                <span className="text-sm text-indigo-300 font-semibold">2.8%</span>
              </div>
            </div>
            <div className="px-4 py-3 bg-neutral-950/40 rounded-3xl border border-neutral-800/40 text-[11px] text-neutral-400">
              The explainability overlay compares AI predictions to role-specific radars and surfaces why a candidate lands in the evaluated bucket. Use this as the starting point for manager-driven calibration before human interviews begin.
            </div>
            <button className="mt-auto px-5 py-2.5 bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 text-sm font-semibold rounded-xl hover:bg-indigo-500/30 transition-all">
              Export perspective
            </button>
          </GlassCard>
        </motion.div>

      </motion.div>
    </div>
  );
}
