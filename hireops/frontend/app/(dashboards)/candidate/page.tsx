"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, Variants } from "framer-motion";
import { Loader2, AlertTriangle } from "lucide-react";

// Extracted components
import { ToastContainer, Toast } from "@/components/candidate/ToastContainer";
import { JobCard, Job, ApplicationResult } from "@/components/candidate/JobCard";

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { ease: "easeOut", duration: 0.5 },
  },
};

// ---------------------------------------------------------------------------
// Main Candidate Page (Orchestrator)
// ---------------------------------------------------------------------------
export default function CandidateDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Map job_id → application result
  const [applications, setApplications] = useState<Record<number, ApplicationResult>>({});
  // Map job_id → "applying" spinner state
  const [applyingFor, setApplyingFor] = useState<Record<number, boolean>>({});

  const [toasts, setToasts] = useState<Toast[]>([]);

  // ------------------------------------------------------------------
  // Toast helpers
  // ------------------------------------------------------------------
  const addToast = useCallback(
    (message: string, type: Toast["type"] = "info") => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type }]);
      // Auto-dismiss after 4s
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Check for toast param
  useEffect(() => {
    const toastParam = searchParams.get("toast");
    if (toastParam === "test_submitted") {
      addToast("Successfully submitted Proctored Test. Processing results...", "success");
      // Clean URL without reloading
      router.replace("/candidate");
    }
  }, [searchParams, addToast, router]);

  // ------------------------------------------------------------------
  // Fetch jobs from backend on mount
  // ------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function fetchJobs() {
      try {
        setLoading(true);
        const res = await fetch("/api/v1/jobs");
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        const data: Job[] = await res.json();
        if (!cancelled) {
          setJobs(data);
          setError(null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Unknown error";
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchJobs();
    return () => {
      cancelled = true;
    };
  }, []);

  // ------------------------------------------------------------------
  // Apply handler
  // ------------------------------------------------------------------
  const handleApply = async (jobId: number) => {
    if (applications[jobId] || applyingFor[jobId]) return;

    setApplyingFor((prev) => ({ ...prev, [jobId]: true }));
    addToast("Application submitted for AI Screening.", "info");

    try {
      const res = await fetch("/api/v1/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId }),
      });

      if (!res.ok) throw new Error(`API returned ${res.status}`);

      const result: ApplicationResult = await res.json();
      setApplications((prev) => ({ ...prev, [jobId]: result }));

      if (result.ai_match_score >= 75) {
        addToast(
          `AI Match: ${result.ai_match_score}% — Cleared for Proctored Testing!`,
          "success"
        );
      } else {
        addToast(
          `AI Match: ${result.ai_match_score}% — Below threshold. Application rejected.`,
          "error"
        );
      }
    } catch {
      addToast("Failed to submit application. Is the backend running?", "error");
    } finally {
      setApplyingFor((prev) => ({ ...prev, [jobId]: false }));
    }
  };

  // Navigation helper for JobCard
  const handleNavigate = (path: string) => router.push(path);

  // ------------------------------------------------------------------
  // Loading / Error states
  // ------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-neutral-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        <p className="text-sm tracking-wide">Fetching open positions…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-400" />
        <h2 className="text-xl font-medium text-neutral-200">Connection Error</h2>
        <p className="text-sm text-neutral-500 max-w-md">
          Could not reach the backend at <code className="text-amber-300">/api/v1/jobs</code>. Make
          sure <code className="text-amber-300">docker compose up</code> is running.
        </p>
        <p className="text-xs text-neutral-600 font-mono">{error}</p>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Main UI
  // ------------------------------------------------------------------
  return (
    <div className="flex flex-col flex-1 p-8 md:p-12 max-w-7xl mx-auto w-full">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <motion.div initial="hidden" animate="show" variants={containerVariants} className="space-y-10">
        {/* Header */}
        <motion.div variants={cardVariants} className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-light tracking-tight text-neutral-100">
            Your Opportunities
          </h1>
          <p className="text-neutral-400 text-lg font-light tracking-wide">
            Browse live roles. Apply and receive instant AI screening results.
          </p>
        </motion.div>

        {/* Jobs Grid */}
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              application={applications[job.id]}
              isApplying={!!applyingFor[job.id]}
              onApply={handleApply}
              onNavigate={handleNavigate}
              variants={cardVariants}
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
