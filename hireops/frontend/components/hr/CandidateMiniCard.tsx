"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Briefcase, Calendar, Loader2, Code, Globe } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { ScoreBadge } from "@/components/ui/ScoreBadge";

export interface HRApplication {
  id: number;
  candidate_id: number;
  candidate: {
    user: {
      full_name: string;
      email: string;
    };
    github?: string | null;
    linkedin?: string | null;
  };
  job_id: number;
  job_title: string;
  company: string;
  status: string;
  match_score?: number | null;
  mcq_score?: number | null;
  coding_score?: number | null;
  voice_score?: number | null;
  ai_feedback?: string | null;
}

interface CandidateMiniCardProps {
  app: HRApplication;
  columnKey: string;
}

export function CandidateMiniCard({ app, columnKey }: CandidateMiniCardProps) {
  const [scheduling, setScheduling] = useState(false);

  const candidateName = app.candidate?.user?.full_name || "Unknown Candidate";
  const candidateEmail = app.candidate?.user?.email || "No email";
  const hasGithub = app.candidate?.github;
  const hasLinkedin = app.candidate?.linkedin;

  const handleSchedule = async () => {
    setScheduling(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1000));
    alert(`📅 1:1 Interview scheduled with ${candidateName} for "${app.job_title}"`);
    setScheduling(false);
  };

  // Determine score display based on assessment phase
  const displayScore = app.mcq_score !== null && app.mcq_score !== undefined
    ? app.mcq_score
    : (app.match_score || null);

  return (
    <GlassCard
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={`bg-neutral-800/30 p-4 rounded-2xl cursor-pointer group transition-all duration-200 ${columnKey === "SHORTLISTED"
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
            {candidateName}
          </p>
          <p className="text-[10px] text-neutral-500 truncate">
            {candidateEmail}
          </p>
        </div>
        {displayScore !== null && (
          <ScoreBadge score={displayScore} className="ml-2" />
        )}
      </div>

      {/* Social Links */}
      {(hasGithub || hasLinkedin) && (
        <div className="flex gap-2 mb-2">
          {hasGithub && (
            <a
              href={hasGithub.startsWith("http") ? hasGithub : `https://github.com/${hasGithub}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 bg-neutral-900/40 border border-neutral-700/40 rounded-lg hover:border-neutral-600 transition-colors"
              title="GitHub"
            >
              <Code className="w-3 h-3 text-neutral-400 hover:text-neutral-300" />
            </a>
          )}
          {hasLinkedin && (
            <a
              href={hasLinkedin.startsWith("http") ? hasLinkedin : `https://linkedin.com/in/${hasLinkedin}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 bg-neutral-900/40 border border-neutral-700/40 rounded-lg hover:border-neutral-600 transition-colors"
              title="LinkedIn"
            >
              <Globe className="w-3 h-3 text-neutral-400 hover:text-neutral-300" />
            </a>
          )}
        </div>
      )}

      {/* Assessment Scores */}
      {(typeof app.mcq_score === 'number' || typeof app.coding_score === 'number' || typeof app.voice_score === 'number') && (
        <div className="space-y-1 mb-2 text-[9px] text-neutral-400">
          {typeof app.mcq_score === 'number' && (
            <div className="flex items-center justify-between">
              <span>MCQ:</span>
              <span className="font-bold text-indigo-400">{app.mcq_score.toFixed(1)}%</span>
            </div>
          )}
          {typeof app.coding_score === 'number' && (
            <div className="flex items-center justify-between">
              <span>Coding:</span>
              <span className="font-bold text-violet-400">{app.coding_score.toFixed(1)}%</span>
            </div>
          )}
          {typeof app.voice_score === 'number' && (
            <div className="flex items-center justify-between">
              <span>Voice:</span>
              <span className="font-bold text-emerald-400">{app.voice_score.toFixed(1)}%</span>
            </div>
          )}
        </div>
      )}

      {/* Job info */}
      <div className="flex items-center gap-1.5 mt-2">
        <Briefcase className="w-3 h-3 text-neutral-600 shrink-0" />
        <span className="text-[10px] text-neutral-400 truncate">
          {app.job_title}
        </span>
      </div>

      {/* Progress bar for pipeline stages */}
      {columnKey !== "SHORTLISTED" && columnKey !== "REJECTED" && displayScore !== null && (
        <div className="mt-3 w-full bg-neutral-950/60 h-1 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(displayScore, 100)}%` }}
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
