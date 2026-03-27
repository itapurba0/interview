"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Briefcase, Calendar, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { ScoreBadge } from "@/components/ui/ScoreBadge";

export interface HRApplication {
  id: number;
  candidate_id: number;
  candidate_name: string;
  candidate_email: string;
  job_id: number;
  job_title: string;
  company: string;
  status: string;
  ai_match_score: number;
}

interface CandidateMiniCardProps {
  app: HRApplication;
  columnKey: string;
}

export function CandidateMiniCard({ app, columnKey }: CandidateMiniCardProps) {
  const [scheduling, setScheduling] = useState(false);

  const handleSchedule = async () => {
    setScheduling(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1000));
    alert(`📅 1:1 Interview scheduled with ${app.candidate_name} for "${app.job_title}"`);
    setScheduling(false);
  };

  return (
    <GlassCard
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={`bg-neutral-800/30 p-4 rounded-2xl cursor-pointer group transition-all duration-200 ${
        columnKey === "SHORTLISTED"
          ? "border-emerald-500/25 hover:border-emerald-500/50 shadow-[0_0_15px_rgba(52,211,153,0.05)]"
          : columnKey === "REJECTED"
          ? "border-red-500/15 opacity-60 hover:opacity-80"
          : "border-neutral-700/40 hover:border-indigo-500/40"
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm text-neutral-100 truncate">
            {app.candidate_name}
          </p>
          <p className="text-[10px] text-neutral-500 truncate">
            {app.candidate_email}
          </p>
        </div>
        {app.ai_match_score > 0 && (
          <ScoreBadge score={app.ai_match_score} className="ml-2" />
        )}
      </div>

      {/* Job info */}
      <div className="flex items-center gap-1.5 mt-2">
        <Briefcase className="w-3 h-3 text-neutral-600 shrink-0" />
        <span className="text-[10px] text-neutral-400 truncate">
          {app.job_title}
        </span>
        <span className="text-[8px] text-neutral-600">•</span>
        <span className="text-[10px] text-neutral-500 truncate">
          {app.company}
        </span>
      </div>

      {/* Progress bar for pipeline stages */}
      {columnKey !== "SHORTLISTED" && columnKey !== "REJECTED" && app.ai_match_score > 0 && (
        <div className="mt-3 w-full bg-neutral-950/60 h-1 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${app.ai_match_score}%` }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
            className="bg-indigo-500/80 h-full rounded-full"
          />
        </div>
      )}

      {/* Schedule 1:1 — only for Shortlisted */}
      {columnKey === "SHORTLISTED" && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSchedule}
          disabled={scheduling}
          className="w-full mt-3 py-2 flex items-center justify-center gap-2 bg-emerald-600/15 border border-emerald-500/25 text-emerald-400 text-[11px] font-bold tracking-wider rounded-xl hover:bg-emerald-600/25 transition-all disabled:opacity-50"
        >
          {scheduling ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Calendar className="w-3 h-3" />
          )}
          {scheduling ? "Scheduling…" : "Schedule 1:1"}
        </motion.button>
      )}
    </GlassCard>
  );
}
