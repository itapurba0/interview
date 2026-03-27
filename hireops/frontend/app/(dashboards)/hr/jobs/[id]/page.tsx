"use client";

import { useState, useEffect, useCallback, use } from "react";
import { motion, Variants } from "framer-motion";
import {
  ArrowLeft,
  Users,
  Search,
  RefreshCw,
  ExternalLink,
  FileText
} from "lucide-react";
import Link from "next/link";

// Extracted components
import { KanbanColumn } from "@/components/hr/KanbanColumn";
import { CandidateMiniCard, HRApplication } from "@/components/hr/CandidateMiniCard";
import { JobDetailsModal } from "@/components/shared/JobDetailsModal";
import { fetchApi } from "@/lib/api";

// Pipeline columns mirroring the ApplicationStatus enum
const PIPELINE_COLUMNS = [
  { key: "APPLIED", label: "Applied", color: "neutral", icon: "📥" },
  { key: "AI_SCREENING", label: "AI Screening", color: "amber", icon: "🤖" },
  { key: "TEST_PENDING", label: "Test Pending", color: "blue", icon: "📝" },
  { key: "VOICE_PENDING", label: "Voice Pending", color: "violet", icon: "🎙️" },
  { key: "SHORTLISTED", label: "Shortlisted", color: "emerald", icon: "⭐" },
] as const;

// ---------------------------------------------------------------------------
// Animations
// ---------------------------------------------------------------------------
const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

const fadeSlideUp: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: "easeOut" },
  },
};

// ---------------------------------------------------------------------------
// Job Pipeline Dashboard (Orchestrator)
// ---------------------------------------------------------------------------
export default function JobPipelineDashboard({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: jobId } = use(params);

  const [applications, setApplications] = useState<HRApplication[]>([]);
  const [jobTitle, setJobTitle] = useState("Pipeline Dashboard");
  const [jobData, setJobData] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // 1. Fetch Job Metadata using authenticated wrapper
      const job = await fetchApi<any>(`/api/v1/jobs/${jobId}`);
      setJobTitle(job.title);
      setJobData(job);

      // 2. Fetch only applications for this specific job context
      const data = await fetchApi<HRApplication[]>(`/api/v1/applications/hr?job_id=${jobId}`);
      setApplications(data);
    } catch (err) {
      console.error("Failed to fetch job context:", err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const filteredApps = searchQuery.trim()
    ? applications.filter((a) =>
      a.candidate?.user?.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : applications;

  // Dynamic column sorting based on assessment status
  const getColumnApps = (key: string) => {
    return filteredApps.filter((a) => {
      switch (key) {
        case "APPLIED":
          // Newly applied candidates or AI screening
          return a.status === "APPLIED" || (a.status === "AI_SCREENING" && !a.mcq_score);

        case "AI_SCREENING":
          // AI screening passed with match score >= 75, ready for tests
          return a.status === "AI_SCREENING" && a.match_score !== null && a.match_score >= 75;

        case "TEST_PENDING":
          // MCQ test pending or in progress
          return a.status === "TEST_PENDING" || (a.mcq_score === null && a.match_score !== null && a.match_score >= 75);

        case "VOICE_PENDING":
          // MCQ passed, voice interview pending
          return (a.mcq_score !== null && a.coding_score !== null && a.voice_score === null);

        case "SHORTLISTED":
          // All assessments passed, ready for final interviews
          return a.status === "SHORTLISTED" || (a.mcq_score !== null && a.coding_score !== null && a.voice_score !== null);

        default:
          return false;
      }
    });
  };

  const rejected = filteredApps.filter((a) => a.status === "REJECTED");

  return (
    <div className="relative flex flex-col h-screen max-h-screen overflow-hidden bg-neutral-950">
      {/* Ambient glows */}
      <div className="absolute top-[5%] left-[20%] w-[600px] h-[600px] bg-indigo-600/[0.04] rounded-full blur-[200px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[20%] w-[500px] h-[500px] bg-emerald-600/[0.03] rounded-full blur-[180px] pointer-events-none" />

      <motion.div
        initial="hidden"
        animate="show"
        variants={staggerContainer}
        className="flex flex-col h-full relative z-10"
      >
        {/* ── Sub-Header / Breadcrumb ─────────────────────────────── */}
        <motion.div
          variants={fadeSlideUp}
          className="flex items-center justify-between px-8 py-5 border-b border-neutral-800/40 shrink-0"
        >
          <div className="flex items-center gap-6">
            <Link href="/hr" className="group p-2.5 bg-neutral-900/60 border border-neutral-800 rounded-xl text-neutral-500 hover:text-neutral-200 transition-all hover:bg-neutral-800">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            </Link>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight text-neutral-100">
                  {jobTitle}
                </h1>
                <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-md text-[10px] text-indigo-400 font-bold uppercase tracking-widest leading-none">
                  Job ID #{jobId}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-1 flex items-center gap-2">
                <Users className="w-3 h-3" />
                {applications.length} Candidates in Pipeline
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-600" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidates…"
                className="bg-neutral-900/60 border border-neutral-800/50 rounded-xl pl-9 pr-4 py-2 text-xs text-neutral-300 placeholder-neutral-600 focus:outline-none focus:border-indigo-500/40 transition-colors w-52"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRefresh}
              className="p-2 bg-neutral-900/60 border border-neutral-800/50 rounded-xl text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </motion.button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/40 text-neutral-300 text-xs font-bold tracking-wider rounded-xl transition-all"
            >
              <FileText className="w-4 h-4" />
              View Job Description
            </button>

            <button className="flex items-center gap-2 px-5 py-2.5 bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/40 text-neutral-300 text-xs font-bold tracking-wider rounded-xl transition-all">
              <ExternalLink className="w-4 h-4" />
              Live Job
            </button>
          </div>
        </motion.div>

        {/* ── Kanban Board (The Core Logic Migration) ──────────────── */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden px-8 py-6 min-h-0 custom-scrollbar">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-indigo-400 gap-4">
              <div className="w-12 h-12 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                Hydrating Decision Vectors…
              </span>
            </div>
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="flex gap-6 h-full items-stretch"
            >
              {PIPELINE_COLUMNS.map((col) => {
                const colApps = getColumnApps(col.key);
                return (
                  <KanbanColumn
                    key={col.key}
                    columnKey={col.key}
                    label={col.label}
                    icon={col.icon}
                    color={col.color}
                    count={colApps.length}
                  >
                    {colApps.map((app) => (
                      <CandidateMiniCard
                        key={app.id}
                        app={app}
                        columnKey={col.key}
                      />
                    ))}
                  </KanbanColumn>
                );
              })}

              {/* Rejected column */}
              <KanbanColumn
                columnKey="REJECTED"
                label="Rejected"
                icon="❌"
                color="red"
                count={rejected.length}
                isRejected
                emptyLabel="Clean pipeline"
              >
                {rejected.map((app) => (
                  <CandidateMiniCard
                    key={app.id}
                    app={app}
                    columnKey="REJECTED"
                  />
                ))}
              </KanbanColumn>
            </motion.div>
          )}
        </div>
      </motion.div>

      <JobDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        job={jobData}
        viewerRole="HR"
      />
    </div>
  );
}
