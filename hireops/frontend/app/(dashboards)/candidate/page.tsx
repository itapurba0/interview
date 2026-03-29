"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, Variants } from "framer-motion";
import { Loader2, AlertTriangle, AlertCircle, ChevronRight } from "lucide-react";

// Extracted components
import { ToastContainer, Toast } from "@/components/candidate/ToastContainer";
import { JobCard, Job, ApplicationResult } from "@/components/candidate/JobCard";
import { JobDetailsModal } from "@/components/shared/JobDetailsModal";
import { fetchApi } from "@/lib/api";
import useSWR from "swr";
import { swrFetcher } from "@/lib/api";

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
function CandidateDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Map job_id → full application object with status  
  const [applications, setApplications] = useState<Record<number, ApplicationResult>>({});
  // Map job_id → "applying" spinner state
  const [applyingFor, setApplyingFor] = useState<Record<number, boolean>>({});
  // Track application errors per job
  const [applyErrors, setApplyErrors] = useState<Record<number, string | null>>({});

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
  // SWR: Fetch jobs + applications with global cache
  // ------------------------------------------------------------------
  const { data: jobsData, isLoading: jobsLoading, error: jobsError } = useSWR<Job[]>(
    "/api/v1/jobs",
    swrFetcher,
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  );

  const { data: appsData, isLoading: appsLoading } = useSWR<Array<{ id: number; job_id: number; candidate_id: number; status: string; ai_match_score?: number; created_at: string; updated_at: string }>>(
    "/api/v1/applications",
    swrFetcher,
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  );

  const jobs = jobsData ?? [];
  const loading = (jobsLoading && !jobsData) || (appsLoading && !appsData);
  const error = jobsError ? (jobsError instanceof Error ? jobsError.message : String(jobsError)) : null;

  // Seed applications from SWR data (runs once when data arrives)
  useEffect(() => {
    if (appsData && Array.isArray(appsData)) {
      const appliedApps: Record<number, ApplicationResult> = {};
      appsData.forEach((app) => {
        appliedApps[app.job_id] = {
          id: app.id,
          job_id: app.job_id,
          candidate_id: app.candidate_id,
          status: app.status as "APPLIED" | "AI_SCREENING" | "TEST_PENDING" | "REJECTED" | "VOICE_PENDING" | "SHORTLISTED" | "SCHEDULED",
          ai_match_score: app.ai_match_score || 0
        };
      });
      setApplications(appliedApps);
    }
  }, [appsData]);

  // ------------------------------------------------------------------
  // Apply handler
  // ------------------------------------------------------------------
  const handleApply = async (jobId: number) => {
    if (applications[jobId] || applyingFor[jobId]) return;

    // Clear any previous error for this job
    setApplyErrors((prev) => ({ ...prev, [jobId]: null }));
    setApplyingFor((prev) => ({ ...prev, [jobId]: true }));

    try {
      const result: ApplicationResult = await fetchApi<ApplicationResult>(
        "/api/v1/applications",
        {
          method: "POST",
          body: JSON.stringify({ job_id: jobId }),
        }
      );

      setApplications((prev) => ({ ...prev, [jobId]: result }));
      addToast(
        `AI Match: ${result.ai_match_score}% — Cleared for Proctored Testing!`,
        "success"
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to submit application";
      // Set error state instead of throwing - let modal display it gracefully
      setApplyErrors((prev) => ({ ...prev, [jobId]: errorMessage }));
    } finally {
      setApplyingFor((prev) => ({ ...prev, [jobId]: false }));
    }
  };

  // Navigation helper for JobCard
  const handleNavigate = (path: string) => router.push(path);

  // Count pending assessments
  const pendingCount = Object.values(applications).filter(app =>
    ["TEST_PENDING", "VOICE_PENDING"].includes(app.status)
  ).length;

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

      {/* Pending Assessments Banner */}
      {pendingCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-linear-to-r from-emerald-500/10 to-emerald-600/5 border border-emerald-500/30 rounded-xl flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-300">
                {pendingCount} {pendingCount === 1 ? "Assessment" : "Assessments"} Waiting
              </p>
              <p className="text-xs text-emerald-300/70">
                Complete your tests to move forward in the interview process.
              </p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push("/candidate/assessment")}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shrink-0"
          >
            View Hub
            <ChevronRight className="w-3 h-3" />
          </motion.button>
        </motion.div>
      )}

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
              onViewDetails={setSelectedJob}
              variants={cardVariants}
            />
          ))}
        </motion.div>
      </motion.div>

      <JobDetailsModal
        isOpen={!!selectedJob}
        onClose={() => {
          if (selectedJob) {
            setApplyErrors((prev) => ({ ...prev, [selectedJob.id]: null }));
          }
          setSelectedJob(null);
        }}
        job={selectedJob}
        viewerRole="CANDIDATE"
        isApplying={selectedJob ? !!applyingFor[selectedJob.id] : false}
        hasApplied={selectedJob ? !!applications[selectedJob.id] : false}
        applyError={selectedJob ? applyErrors[selectedJob.id] || null : null}
        onApply={handleApply}
      />
    </div>
  );
}

export default function CandidateDashboard() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col flex-1 items-center justify-center min-h-[60vh] gap-4 text-neutral-400 p-8">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          <p className="text-sm tracking-wide">Preparing your opportunities…</p>
        </div>
      }
    >
      <CandidateDashboardContent />
    </Suspense>
  );
}
