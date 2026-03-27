"use client";

import { motion } from "framer-motion";
import { Trophy, AlertTriangle, Ban, Home } from "lucide-react";

interface AssessmentResult {
  assessment_id: string;
  candidate_id: number;
  mcq_score: number;
  mcq_total: number;
  coding_submitted: boolean;
  proctoring_flags: number;
  overall_status: "PASSED" | "FLAGGED" | "FAILED";
}

interface AssessmentResultScreenProps {
  result: AssessmentResult;
  applicationId?: number | null;
  handleExitAndReturn: () => void;
}

export function AssessmentResultScreen({
  result,
  applicationId,
  handleExitAndReturn,
}: AssessmentResultScreenProps) {
  const getSuccessMessage = () => {
    if (result.overall_status === "PASSED") {
      return "MCQ Assessment Complete! Your results have been transmitted to the hiring team. Please return to your Applications tab to check for any pending technical assessments.";
    } else if (result.overall_status === "FLAGGED") {
      return "MCQ Assessment Complete with flags. Your submission will be reviewed by the hiring team. Please return to your Applications tab to continue with other assessments if available.";
    } else {
      return "Assessment submission recorded. Please return to your Applications tab for next steps or to contact the hiring team.";
    }
  };
  return (
    <div className="fixed inset-0 min-h-screen flex items-center justify-center bg-neutral-950 p-8 z-[99999]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`max-w-lg w-full text-center space-y-8 p-10 rounded-[2.5rem] border backdrop-blur-3xl shadow-2xl ${result.overall_status === "PASSED"
            ? "bg-emerald-950/30 border-emerald-700/40"
            : result.overall_status === "FLAGGED"
              ? "bg-amber-950/30 border-amber-700/40"
              : "bg-red-950/30 border-red-700/40"
          }`}
      >
        <div
          className={`mx-auto w-20 h-20 rounded-3xl flex items-center justify-center border shadow-lg ${result.overall_status === "PASSED"
              ? "bg-emerald-500/15 border-emerald-500/30 shadow-emerald-500/20"
              : result.overall_status === "FLAGGED"
                ? "bg-amber-500/15 border-amber-500/30 shadow-amber-500/20"
                : "bg-red-500/15 border-red-500/30 shadow-red-500/20"
            }`}
        >
          {result.overall_status === "PASSED" && (
            <Trophy className="w-10 h-10 text-emerald-400" />
          )}
          {result.overall_status === "FLAGGED" && (
            <AlertTriangle className="w-10 h-10 text-amber-400" />
          )}
          {result.overall_status === "FAILED" && (
            <Ban className="w-10 h-10 text-red-400" />
          )}
        </div>

        <div>
          <h2 className="text-3xl font-semibold text-neutral-100 mb-2">
            {result.overall_status === "PASSED"
              ? "Assessment Passed!"
              : result.overall_status === "FLAGGED"
                ? "Assessment Flagged for Review"
                : "Assessment Failed"}
          </h2>
          <p className="text-neutral-400 text-sm leading-relaxed">
            {getSuccessMessage()}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="bg-neutral-900/60 rounded-2xl p-4 border border-neutral-800/50">
            <p className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider mb-1">
              MCQ Score
            </p>
            <p className="text-xl font-bold text-neutral-100">
              {result.mcq_score}/{result.mcq_total}
            </p>
          </div>
          <div className="bg-neutral-900/60 rounded-2xl p-4 border border-neutral-800/50">
            <p className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider mb-1">
              Code
            </p>
            <p className="text-xl font-bold text-neutral-100">
              {result.coding_submitted ? "✓" : "✗"}
            </p>
          </div>
          <div className="bg-neutral-900/60 rounded-2xl p-4 border border-neutral-800/50">
            <p className="text-neutral-500 text-[10px] uppercase font-bold tracking-wider mb-1">
              Flags
            </p>
            <p
              className={`text-xl font-bold ${result.proctoring_flags > 0
                  ? "text-red-400"
                  : "text-emerald-400"
                }`}
            >
              {result.proctoring_flags}
            </p>
          </div>
        </div>

        <button
          onClick={handleExitAndReturn}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-500/20 mt-6"
        >
          <Home className="w-5 h-5" />
          {applicationId ? "View Application Details" : "Return to Applications"}
        </button>
      </motion.div>
    </div>
  );
}
