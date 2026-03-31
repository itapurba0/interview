"use client";

import { motion, Variants } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipProps } from "recharts";
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
  shortlisted_count: number;
  interviews_pending: number;
}

interface ChartPoint extends JobPipelineEntry {
  gradientId: string;
  color: string;
}

const chartPalette = ["#6366f1", "#22d3ee", "#34d399", "#f97316"] as const;

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
  const totalJobs = jobPipeline.length;

  const chartData = useMemo<ChartPoint[]>(
    () =>
      featuredJobs.map((job, idx) => ({
        ...job,
        gradientId: `job-gradient-${idx}`,
        color: chartPalette[idx % chartPalette.length],
      })),
    [featuredJobs]
  );

  const renderTooltip = ({ active, payload, label }: TooltipProps<number, string>) =>
    active && payload && payload.length ? (
      <div className="rounded-2xl bg-neutral-950/80 p-3 text-sm text-white shadow-lg">
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-400">{label}</p>
        <p className="pt-1">
          <span className="text-blue-300">● </span>
          Total Applicants: {payload[0].value}
        </p>
        <p>
          <span className="text-emerald-300">● </span>
          Shortlisted: {payload[1]?.value ?? 0}
        </p>
        <p className="text-xs text-indigo-300 pt-1">
          {chartData.find((point) => point.title === label)?.interviews_pending ?? 0} voice pending
        </p>
      </div>
    ) : null;

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
              <span className="text-[10px] text-neutral-400">Total applicants vs. Shortlisted candidates by job</span>
            </div>
            <p className="text-sm text-neutral-300 mb-6">
              {jobsLoading
                ? "Loading pipeline breakdown..."
                : `Visualization of ${jobPipeline.length} job${jobPipeline.length === 1 ? "" : "s"} showing blue bars for total applicants and green bars for shortlisted candidates.`
              }
            </p>
            <div className="h-[360px] w-full">
              {jobsLoading ? (
                <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-neutral-800/50 pb-6 pt-8 text-center text-sm text-neutral-500">
                  Fetching data from /api/v1/jobs/hr...
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 24, right: 16, left: 4, bottom: 48 }}>
                    <defs>
                      {chartData.map((entry) => (
                        <linearGradient id={entry.gradientId} key={entry.gradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={entry.color} stopOpacity={0.92} />
                          <stop offset="100%" stopColor={entry.color} stopOpacity={0.35} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.35)" />
                    <XAxis
                      dataKey="title"
                      tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 500 }}
                      angle={-10}
                      textAnchor="end"
                      interval={0}
                      height={60}
                    />
                    <YAxis
                      tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                      width={48}
                    />
                    <Tooltip content={renderTooltip} />
                    <Bar dataKey="applicant_count" fill="#60a5fa" barSize={32} radius={[8, 8, 0, 0]}>
                      {chartData.map((_, idx) => (
                        <Cell key={`app-${idx}`} fill="#60a5fa" />
                      ))}
                    </Bar>
                    <Bar dataKey="shortlisted_count" fill="#34d399" barSize={32} radius={[8, 8, 0, 0]}>
                      {chartData.map((_, idx) => (
                        <Cell key={`short-${idx}`} fill="#34d399" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-neutral-800/60 px-6 text-sm text-neutral-400">
                  No jobs found for your tenant yet. Create a posting to seed the explainability graph.
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>

      </motion.div>
    </div>
  );
}
