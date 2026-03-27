"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Building,
  MapPin,
  Clock,
  Sparkles,
  Loader2,
  CheckCircle2,
  Users,
  AlertCircle,
  Upload
} from "lucide-react";
import { useRouter } from "next/navigation";
import { GlassModal } from "@/components/ui/GlassModal";

export interface JobDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: any; // Accept flexible job shape between Candidate/HR endpoints
  viewerRole: "CANDIDATE" | "HR";
  isApplying?: boolean;
  hasApplied?: boolean;
  applyError?: string | null;
  onApply?: (jobId: number) => void;
}

export function JobDetailsModal({
  isOpen,
  onClose,
  job,
  viewerRole,
  isApplying = false,
  hasApplied = false,
  applyError: externalApplyError = null,
  onApply,
}: JobDetailsModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectionFeedback, setRejectionFeedback] = useState<string | null>(null);
  const [applied, setApplied] = useState(hasApplied);

  // Use external error if provided, otherwise use local error state
  const displayError = externalApplyError || error;

  const handleApplyClick = async () => {
    if (!onApply) return;

    setIsSubmitting(true);
    setError(null);
    setRejectionFeedback(null);

    try {
      await onApply(job.id);
      // Only mark as applied if onApply succeeds without error
      if (!externalApplyError) {
        setApplied(true);
      }
    } catch (err: unknown) {
      let errorMessage = "An error occurred while applying. Please try again.";

      if (err instanceof Error) {
        errorMessage = err.message;
      }

      // If error is "already applied", mark as applied instead of showing error
      if (errorMessage.includes("already applied")) {
        setApplied(true);
      }
      // If 403 rejection error, display AI feedback in rejection UI
      else if (errorMessage.includes("minimum match") || errorMessage.includes("Below")) {
        // Extract AI reasoning from error message if available
        // Error format: "Below minimum match threshold. AI Feedback: ..."
        const feedbackMatch = errorMessage.match(/AI Feedback:\s*(.+?)(?:\.|$)/);
        const feedback = feedbackMatch ? feedbackMatch[1].trim() : "Your qualifications do not meet the minimum requirements for this role.";
        setRejectionFeedback(feedback);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!job) return null;

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} className="max-w-3xl overflow-hidden p-0">
      {/* Scrollable Content Container */}
      <div className="max-h-[85vh] overflow-y-auto custom-scrollbar">
        {/* Header Section */}
        <div className="p-8 pb-6 border-b border-neutral-800/50 bg-neutral-900/40 relative">
          <div className="flex justify-between items-start pr-8">
            <div>
              <h2 className="text-3xl font-semibold text-neutral-100 tracking-tight leading-snug">
                {job.title}
              </h2>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-4 text-sm text-neutral-400 font-medium">
                {job.company && (
                  <span className="flex items-center gap-1.5 text-neutral-300">
                    <Building className="w-4 h-4 text-neutral-500" />
                    {job.company}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-neutral-500" />
                  Remote
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-neutral-500" />
                  Full-time
                </span>
                {job.date_posted && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-800/60 rounded-lg text-xs tracking-wider border border-neutral-700/40">
                    Posted: {job.date_posted}
                  </span>
                )}
              </div>
            </div>
            {viewerRole === "HR" && (
              <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-[10px] text-indigo-400 font-bold uppercase tracking-widest">
                HR PREVIEW
              </span>
            )}
          </div>
        </div>

        {/* Body Section */}
        <div className="p-8 pb-32 space-y-10">
          <div>
            <h3 className="text-lg font-medium text-neutral-200 mb-4 px-2 border-l-2 border-indigo-500">
              Role Overview
            </h3>
            <div className="text-neutral-400 leading-relaxed text-[15px] whitespace-pre-wrap ml-2 font-light">
              {job.description || "No description provided."}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-neutral-200 mb-4 px-2 border-l-2 border-emerald-500">
              Required Skills
            </h3>
            <div className="flex flex-wrap gap-2 ml-2">
              {job.skills && job.skills.length > 0 ? (
                job.skills.map((skill: string) => (
                  <span
                    key={skill}
                    className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-300 bg-emerald-500/10 rounded-xl border border-emerald-500/20"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-neutral-500 italic text-sm">Skills not specified.</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Conditional Sticky Footer for Candidates */}
      {viewerRole === "CANDIDATE" && (
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-neutral-900 via-neutral-900/90 to-transparent border-t border-neutral-800/50 rounded-b-3xl">
          {/* Rejection Feedback UI */}
          {rejectionFeedback && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-6 bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/30 rounded-xl"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  <AlertCircle className="w-6 h-6 text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-amber-300 font-semibold text-sm mb-2">Application Not Submitted</p>
                  <p className="text-amber-200/90 text-sm leading-relaxed">{rejectionFeedback}</p>
                  <p className="text-amber-200/60 text-xs mt-3 italic">Consider developing these skills or exploring similar roles that better match your background.</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Error Alert */}
          {displayError && !rejectionFeedback && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-300 text-sm font-medium">{displayError}</p>

                {/* Resume Upload CTA */}
                {displayError.includes("Please upload a resume first") && (
                  <Link href="/candidate/profile">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={onClose}
                      className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 rounded-lg text-sm font-semibold transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Resume
                    </motion.button>
                  </Link>
                )}
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-bold text-sm text-neutral-400 hover:text-white transition-colors"
            >
              Cancel
            </button>

            {!rejectionFeedback && !applied && !hasApplied ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleApplyClick}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-8 py-3 bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:bg-indigo-400 transition-colors disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting Application…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Apply for this Role
                  </>
                )}
              </motion.button>
            ) : !rejectionFeedback && (applied || hasApplied) ? (
              <div className="flex items-center gap-2 px-8 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl font-bold text-sm cursor-not-allowed">
                <CheckCircle2 className="w-5 h-5" />
                {applied ? "Application Submitted" : "✓ Already Applied"}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Conditional Sticky Footer for HR */}
      {viewerRole === "HR" && (
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-neutral-900 via-neutral-900/90 to-transparent border-t border-neutral-800/50 flex justify-end gap-4 rounded-b-3xl">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-bold text-sm text-neutral-400 hover:text-white transition-colors"
          >
            Close
          </button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              onClose();
              router.push(`/hr/jobs/${job.id}`);
            }}
            className="flex items-center gap-2 px-8 py-3 bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:bg-indigo-400 transition-colors"
          >
            <Users className="w-5 h-5" />
            View Candidate Pipeline
          </motion.button>
        </div>
      )}
    </GlassModal>
  );
}
