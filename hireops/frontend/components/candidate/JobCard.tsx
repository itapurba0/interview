"use client";

import { useState } from "react";
import { motion, Variants } from "framer-motion";
import {
  Briefcase,
  Building,
  Sparkles,
  FlaskConical,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ScoreBadge } from "@/components/ui/ScoreBadge";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface Job {
  id: number;
  title: string;
  company: string;
  company_id: number;
  description: string;
  skills: string[];
  is_active: boolean;
}

export interface ApplicationResult {
  id: number;
  job_id: number;
  candidate_id: number;
  status: "APPLIED" | "AI_SCREENING" | "TEST_PENDING" | "REJECTED" | "VOICE_PENDING" | "SHORTLISTED" | "SCHEDULED";
  ai_match_score: number;
}

interface JobCardProps {
  job: Job;
  application?: ApplicationResult;
  isApplying: boolean;
  onApply: (jobId: number) => void;
  onNavigate: (path: string) => void;
  onViewDetails: (job: Job) => void;
  variants?: Variants;
}

export function JobCard({
  job,
  application,
  isApplying,
  onApply,
  onNavigate,
  onViewDetails,
  variants,
}: JobCardProps) {

  // ── Action footer logic ──
  function renderCardAction() {
    if (isApplying) {
      return (
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          AI Screening…
        </div>
      );
    }

    // If application exists
    if (application) {
      // Application was rejected - show "Not a Match"
      if (application.status === "REJECTED") {
        return (
          <div className="flex items-center gap-3">
            <StatusBadge status="REJECTED" withIcon />
            <span className="text-xs font-medium text-neutral-500">
              Score: {application.ai_match_score}%
            </span>
          </div>
        );
      }

      // AI Screening in progress
      if (application.status === "AI_SCREENING") {
        return (
          <div className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-blue-500/15 text-blue-300 rounded-xl border border-blue-500/30">
            <Loader2 className="w-4 h-4 animate-spin" />
            Screening in Progress
          </div>
        );
      }

      // Test/Assessment pending - "Resume Assessment"
      if (application.status === "TEST_PENDING") {
        return (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(`/candidate/application/${job.id}`);
            }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 rounded-xl border border-emerald-500/30 hover:bg-emerald-500/25 transition-all"
          >
            <FlaskConical className="w-4 h-4" />
            Resume Assessment
            <ChevronRight className="w-3 h-3 opacity-60" />
          </motion.button>
        );
      }

      // Voice interview pending
      if (application.status === "VOICE_PENDING") {
        return (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(`/candidate/interview/${job.id}`);
            }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-violet-500/15 text-violet-300 rounded-xl border border-violet-500/30 hover:bg-violet-500/25 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Start AI Interview
            <ChevronRight className="w-3 h-3 opacity-60" />
          </motion.button>
        );
      }

      // Shortlisted - "Under Review"
      if (application.status === "SHORTLISTED") {
        return (
          <div className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 rounded-xl border border-amber-500/30">
            <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
            Under Review
          </div>
        );
      }

      // Scheduled - "Interview Scheduled"
      if (application.status === "SCHEDULED") {
        return (
          <div className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-300 rounded-xl border border-indigo-500/30">
            <span className="w-2 h-2 bg-indigo-400 rounded-full"></span>
            Interview Scheduled
          </div>
        );
      }

      // Applied (initial state, no status action yet)
      if (application.status === "APPLIED") {
        return (
          <div className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-500/30">
            <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
            Applied
          </div>
        );
      }

      // Fallback for unknown status
      return (
        <div className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-500/30">
          <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
          Applied
        </div>
      );
    }

    // No application yet - show "Apply" button
    return (
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={(e) => {
          e.stopPropagation();
          onApply(job.id);
        }}
        className="flex items-center gap-2 px-6 py-2.5 text-xs font-black uppercase tracking-widest bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] rounded-xl hover:bg-indigo-400 hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all ml-auto"
      >
        <Sparkles className="w-4 h-4" />
        Apply for this Role
      </motion.button>
    );
  }

  return (
    <GlassCard
      variants={variants}
      glassStyle={
        application?.status === "REJECTED"
          ? "red"
          : application?.status === "TEST_PENDING" || application?.status === "VOICE_PENDING"
            ? "emerald"
            : "default"
      }
      whileHover={{ scale: 1.015, y: -4 }}
      className="group p-6 rounded-3xl flex flex-col justify-between transition-colors duration-300 cursor-pointer"
      onClick={() => onViewDetails(job)}
    >
      {/* Card Upper */}
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="bg-neutral-800/60 p-2 rounded-xl border border-neutral-700/40">
            <Briefcase className="w-5 h-5 text-neutral-400" />
          </div>
          {application && (
            <ScoreBadge score={application.ai_match_score} />
          )}
        </div>

        <h3 className="text-xl font-semibold text-neutral-100 tracking-tight leading-snug">
          {job.title}
        </h3>

        <div className="flex items-center gap-1.5 text-neutral-500 text-sm">
          <Building className="w-3.5 h-3.5" />
          {job.company}
        </div>

        <p className="text-neutral-500 text-sm leading-relaxed line-clamp-2">
          {job.description}
        </p>

        {/* Skills */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {job.skills && job.skills.map((skill) => (
            <span
              key={skill}
              className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 bg-neutral-800/60 rounded-lg border border-neutral-700/40"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="mt-6 pt-4 border-t border-neutral-800/50 flex justify-end">
        {renderCardAction()}
      </div>
    </GlassCard>
  );
}
