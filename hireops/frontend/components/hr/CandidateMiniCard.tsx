"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Briefcase, Calendar, Loader2, ThumbsUp, Ban, AlertTriangle, FileText } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { fetchApi } from "@/lib/api";

export interface HRApplication {
  id: number;
  candidate_id: number;
  candidate: {
    id: number;
    full_name: string;
    email: string;
  };
  job_id: number;
  job: {
    id: number;
    title: string;
    company?: {
      id: number;
      name: string;
      description?: string;
    } | null;
    description?: string;
  };
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

interface VoiceEvaluation {
  technical_score?: number;
  communication_score?: number;
  strengths?: string[];
  weaknesses?: string[];
  hire_recommendation?: string;
  summary?: string;
}

export function CandidateMiniCard({ app, columnKey }: CandidateMiniCardProps) {
  const router = useRouter();
  const [scheduling, setScheduling] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showEvaluationDetails, setShowEvaluationDetails] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isShortlisting, setIsShortlisting] = useState(false);
  const [isRejectingAfterEval, setIsRejectingAfterEval] = useState(false);

  const candidateName = app.candidate?.full_name || "Unknown Candidate";
  const candidateEmail = app.candidate?.email || "No email";
  const jobTitle = app.job?.title || "Unknown Job";
  const companyName = app.job?.company?.name || "Unknown Company";

  // Test passing threshold (50%)
  const PASSING_THRESHOLD = 50;
  const mcqPassed = typeof app.mcq_score === 'number' && app.mcq_score >= PASSING_THRESHOLD;
  const codingPassed = typeof app.coding_score === 'number' && app.coding_score >= PASSING_THRESHOLD;

  const handleSchedule = async () => {
    setScheduling(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1000));
    alert(`📅 1:1 Interview scheduled with ${candidateName} for "${jobTitle}"`);
    setScheduling(false);
  };

  const handleReject = async () => {
    const reason = mcqPassed && codingPassed
      ? "Unknown reason"
      : !mcqPassed && !codingPassed
        ? `Both tests failed (MCQ: ${app.mcq_score?.toFixed(1)}%, Coding: ${app.coding_score?.toFixed(1)}%)`
        : !mcqPassed
          ? `MCQ test failed (${app.mcq_score?.toFixed(1)}%)`
          : `Coding test failed (${app.coding_score?.toFixed(1)}%)`;

    if (!window.confirm(`Reject ${candidateName}?\n\nReason: ${reason}`)) {
      return;
    }

    setIsRejecting(true);
    try {
      await fetchApi(`/api/v1/applications/${app.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "REJECTED" }),
      });

      alert(`🚫 ${candidateName} has been rejected.`);
      router.refresh();
    } catch (error) {
      console.error("Error rejecting candidate:", error);
      alert(`❌ Error: ${error instanceof Error ? error.message : "Failed to reject candidate"}`);
    } finally {
      setIsRejecting(false);
    }
  };

  // Determine score display based on assessment phase
  const displayScore = app.mcq_score !== null && app.mcq_score !== undefined
    ? app.mcq_score
    : (app.match_score || null);

  const evaluationData = useMemo<VoiceEvaluation | null>(() => {
    if (!app.ai_feedback) {
      return null;
    }
    try {
      if (typeof app.ai_feedback === "string") {
        return JSON.parse(app.ai_feedback) as VoiceEvaluation;
      }
      return app.ai_feedback as VoiceEvaluation;
    } catch {
      return null;
    }
  }, [app.ai_feedback]);

  const strengths = Array.isArray(evaluationData?.strengths)
    ? evaluationData!.strengths
    : [];
  const weaknesses = Array.isArray(evaluationData?.weaknesses)
    ? evaluationData!.weaknesses
    : [];

  const evaluationReady = Boolean(evaluationData);
  const isInterviewEvaluated = app.status === "INTERVIEW_EVALUATED";

  const handleForceEvaluate = async () => {
    setIsEvaluating(true);
    try {
      await fetchApi(`/api/v1/interview/${app.id}/evaluate`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      alert(`🎯 Evaluation queued for ${candidateName}.`);
      router.refresh();
    } catch (error) {
      console.error("Error triggering evaluation:", error);
      alert(`❌ Evaluation failed: ${error instanceof Error ? error.message : "unknown"}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleShortlist = async () => {
    setIsShortlisting(true);
    try {
      await fetchApi(`/api/v1/interview/${app.id}/shortlist`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      alert(`✓ ${candidateName} has been shortlisted!`);
      router.refresh();
    } catch (error) {
      console.error("Error shortlisting candidate:", error);
      alert(`❌ Shortlist failed: ${error instanceof Error ? error.message : "unknown"}`);
    } finally {
      setIsShortlisting(false);
    }
  };

  const handleRejectAfterEval = async () => {
    setIsRejectingAfterEval(true);
    try {
      await fetchApi(`/api/v1/interview/${app.id}/reject`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      alert(`✗ ${candidateName} has been rejected.`);
      router.refresh();
    } catch (error) {
      console.error("Error rejecting candidate:", error);
      alert(`❌ Reject failed: ${error instanceof Error ? error.message : "unknown"}`);
    } finally {
      setIsRejectingAfterEval(false);
    }
  };

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
          {jobTitle}
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

      {/* Evaluation toggle */}
      {isInterviewEvaluated && (
        <div className="mt-3 space-y-2">
          {evaluationReady && (
            <motion.button
              type="button"
              onClick={() => setShowEvaluationDetails((prev) => !prev)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-200 font-semibold tracking-wide hover:border-indigo-400/50 transition"
            >
              <FileText className="w-3 h-3" />
              {showEvaluationDetails ? "Hide evaluation" : "View evaluation"}
            </motion.button>
          )}

          {!evaluationReady && (
            <motion.button
              type="button"
              disabled={isEvaluating}
              onClick={handleForceEvaluate}
              className={`w-full flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-semibold tracking-wide transition ${isEvaluating
                ? "border-neutral-700 bg-neutral-900/60 text-neutral-500 cursor-wait"
                : "border-amber-500/30 bg-amber-500/10 text-amber-200 hover:border-amber-400/50"
                }`}
            >
              <Loader2 className="w-3 h-3" />
              {isEvaluating ? "Evaluating..." : "Force evaluation"}
            </motion.button>
          )}

          {showEvaluationDetails && evaluationReady && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3 bg-neutral-900/60 border border-neutral-800/60 rounded-2xl p-3 text-[11px] text-neutral-200"
            >
              {(evaluationData?.technical_score ?? evaluationData?.communication_score) !== undefined && (
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-neutral-500">
                  <span>Overall Score</span>
                  {evaluationData?.technical_score != null ? (
                    <ScoreBadge score={Math.round(evaluationData.technical_score)} className="text-[10px]" />
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </div>
              )}

              {evaluationData?.communication_score != null && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-neutral-500">Communication</span>
                  <span className="text-sm font-semibold text-emerald-400">
                    {Math.round(evaluationData.communication_score)}%
                  </span>
                </div>
              )}

              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">Summary</p>
                <p className="text-sm text-neutral-200 leading-tight">
                  {evaluationData?.summary ?? "No summary available yet."}
                </p>
              </div>

              {strengths.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">Strengths</p>
                  <ul className="mt-1 list-disc list-inside space-y-0.5 text-[11px] text-neutral-300">
                    {strengths.map((item, index) => (
                      <li key={`strength-${index}-${item}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {weaknesses.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">Opportunities</p>
                  <ul className="mt-1 list-disc list-inside space-y-0.5 text-[11px] text-neutral-300">
                    {weaknesses.map((item, index) => (
                      <li key={`weakness-${index}-${item}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {evaluationData?.hire_recommendation && (
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-neutral-500">
                  <span>Recommendation</span>
                  <span className="text-sm font-semibold text-amber-300">
                    {evaluationData.hire_recommendation}
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}

      {/* Shortlist/Reject Buttons - After Evaluation */}
      {isInterviewEvaluated && evaluationReady && (
        <div className="flex gap-2 mt-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleShortlist}
            disabled={isShortlisting}
            className="flex-1 py-2 flex items-center justify-center gap-2 bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold tracking-wider rounded-lg hover:bg-emerald-600/25 disabled:opacity-50 transition-all"
          >
            {isShortlisting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <ThumbsUp className="w-3 h-3" />
            )}
            {isShortlisting ? "Shortlisting…" : "✓ Shortlist"}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRejectAfterEval}
            disabled={isRejectingAfterEval}
            className="flex-1 py-2 flex items-center justify-center gap-2 bg-red-600/15 border border-red-500/30 text-red-400 text-[11px] font-bold tracking-wider rounded-lg hover:bg-red-600/25 disabled:opacity-50 transition-all"
          >
            {isRejectingAfterEval ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Ban className="w-3 h-3" />
            )}
            {isRejectingAfterEval ? "Rejecting…" : "✗ Reject"}
          </motion.button>
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
