"use client";

import { motion, Variants } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { fetchApi } from "@/lib/api";

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

interface JobPipelineEntry {
  title: string;
  applicant_count: number;
  interviews_pending: number;
}

export default function ManagerDashboard() {
  const [jobPipeline, setJobPipeline] = useState<JobPipelineEntry[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadJobs = async () => {
      try {
        const jobs = await fetchApi<JobPipelineEntry[]>("/api/v1/jobs/hr");
        if (mounted) {
          setJobPipeline(jobs);
        }
      } catch (error) {
        console.error("Failed to load job pipeline data", error);
      } finally {
        if (mounted) {
          setJobsLoading(false);
        }
      }
    };

    loadJobs();
    return () => {
      mounted = false;
    };
  }, []);

  const totalApplications = useMemo(
    () => jobPipeline.reduce((sum, job) => sum + job.applicant_count, 0),
    [jobPipeline]
  );

  const totalInterviewsPending = useMemo(
    () => jobPipeline.reduce((sum, job) => sum + job.interviews_pending, 0),
    [jobPipeline]
  );

  const featuredJobs = useMemo(() => jobPipeline.slice(0, 4), [jobPipeline]);
  const maxApplications = useMemo(
    () => Math.max(...jobPipeline.map((job) => job.applicant_count), 1),
    [jobPipeline]
  );
  const totalJobs = jobPipeline.length;

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
            <h4 className="text-3xl text-neutral-100 font-light tracking-tight">
              {jobsLoading ? "Loading…" : `${totalApplications} Candidates`}
            </h4>
          </GlassCard>
          <GlassCard className="p-8 rounded-[2rem] flex flex-col gap-2 border-emerald-500/20">
            <p className="text-[10px] text-emerald-500/70 font-bold uppercase tracking-widest">High Match Velocity</p>
            <h4 className="text-3xl text-emerald-400 font-light tracking-tight">
              {jobsLoading ? "Loading…" : `${totalJobs} Jobs`}
            </h4>
          </GlassCard>
          <GlassCard className="p-8 rounded-[2rem] flex flex-col gap-2 border-indigo-500/20">
            <p className="text-[10px] text-indigo-400/70 font-bold uppercase tracking-widest">Voice interviews pending</p>
            <h4 className="text-3xl text-indigo-100 font-light tracking-tight">
              {jobsLoading ? "Loading…" : `${totalInterviewsPending} Pending`}
            </h4>
          </GlassCard>
        </motion.div>

        {/* Graph explanation by job */}
        <motion.div variants={widgetVariants} className="space-y-4">
          <GlassCard className="rounded-[2.5rem] p-6 bg-neutral-900/40 border border-neutral-800/60">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 font-bold">Job-level context</p>
              <span className="text-[10px] text-neutral-400">Explainability graph weighted by candidate volume</span>
            </div>
            <p className="text-sm text-neutral-300 mb-6">
              {jobsLoading
                ? "Loading pipeline breakdown..."
                : `The graph is shaped by ${jobPipeline.length} job${jobPipeline.length === 1 ? "" : "s"} that together have ${totalApplications} applications and ${totalInterviewsPending} voice interviews pending.`
              }
            </p>
            <div className="flex flex-col gap-4">
              {jobsLoading ? (
                <div className="rounded-2xl border border-dashed border-neutral-800/50 p-6 text-center text-sm text-neutral-500">
                  Fetching data from /api/v1/jobs/hr...
                </div>
              ) : featuredJobs.length > 0 ? (
                featuredJobs.map((job) => (
                  <div key={job.title} className="bg-neutral-950/50 border border-neutral-800/60 rounded-2xl p-4">
                    <div className="flex items-baseline justify-between gap-4">
                      <p className="text-sm font-semibold text-neutral-300">{job.title}</p>
                      <span className="text-xs text-neutral-500 uppercase tracking-[0.3em]">applications</span>
                    </div>
                    <div className="mt-3 h-2 bg-neutral-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-400"
                        style={{ width: `${(job.applicant_count / maxApplications) * 100}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-sm text-neutral-400">
                      <span className="text-2xl text-neutral-100 font-light">{job.applicant_count}</span>
                      <span className="uppercase tracking-[0.3em]">apps total</span>
                      <span className="ml-auto text-emerald-300 font-semibold">{job.interviews_pending} voice interviews pending</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-neutral-800/60 p-8 text-center text-sm text-neutral-400">
                  No jobs found for your tenant yet. Create a new posting in HR to seed the explainability graph.
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>

      </motion.div>
    </div>
  );
}
