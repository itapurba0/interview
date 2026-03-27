"use client";

import { useState, useEffect, use } from "react";
import { motion, Variants } from "framer-motion";
import { Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";

// Extracted components
import { CandidateInsightsCard } from "@/components/manager/CandidateInsightsCard";
import { ExplainabilityRadarChart } from "@/components/manager/ExplainabilityRadarChart";
import { BiasDetectionWidget } from "@/components/manager/BiasDetectionWidget";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ExplainabilityData {
  candidate_name: string;
  candidate_email: string;
  job_title: string;
  ai_match_score: number;
  ai_feedback: string;
  bias_fairness_indicator: {
    status: string;
    confidence_score: number;
    sentiment: string;
  };
  assessment: {
    mcq_score: number;
    coding_score: number;
    proctoring_flags: number;
    skills_radar: any[];
  };
}

// ---------------------------------------------------------------------------
// Animations
// ---------------------------------------------------------------------------
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const fadeSlideUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { ease: "easeOut", duration: 0.6 },
  },
};

// ---------------------------------------------------------------------------
// Manager Detail Page (Orchestrator)
// ---------------------------------------------------------------------------
export default function ManagerApplicationDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: applicationId } = use(params);
  
  const [data, setData] = useState<ExplainabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/v1/analytics/application/${applicationId}`);
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Network error");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [applicationId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 text-neutral-400">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.2)]" />
        <p className="text-sm font-medium tracking-[0.2em] uppercase">Hydrating AI Intelligence...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 px-4 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-400" />
        <h2 className="text-2xl font-light text-neutral-200">System Desynchronization</h2>
        <p className="text-neutral-500 max-w-md font-light leading-relaxed">
          Could not fetch explainability vector for application <code className="text-indigo-400">#{applicationId}</code>.
        </p>
        <Link href="/manager" className="px-6 py-2 border border-neutral-800 rounded-xl text-neutral-400 hover:bg-neutral-900 transition-colors flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Return to Intelligence Hub
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 p-8 md:p-12 max-w-[1600px] mx-auto w-full relative">
      {/* Background Orbs */}
      <div className="absolute top-[10%] right-[15%] w-[600px] h-[600px] bg-indigo-600/[0.03] rounded-full blur-[200px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[10%] w-[500px] h-[500px] bg-emerald-600/[0.02] rounded-full blur-[180px] pointer-events-none" />

      <motion.div initial="hidden" animate="show" variants={containerVariants} className="space-y-12 relative z-10">
        
        {/* Navigation Breadcrumb */}
        <motion.div variants={fadeSlideUp}>
          <Link href="/manager" className="group flex items-center gap-2 text-neutral-500 hover:text-neutral-200 transition-colors mb-6 w-fit">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-widest">Pipeline Review</span>
          </Link>
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-4xl md:text-5xl font-light tracking-tight text-neutral-100">Decision explainability</h1>
              <p className="text-neutral-400 text-lg font-light tracking-wide mt-2">Deep-dive into Agentic reasoning and behavioral topology.</p>
            </div>
          </div>
        </motion.div>

        {/* 2-Column Insight Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* Left Column: Core Insights */}
          <CandidateInsightsCard 
            candidateName={data.candidate_name}
            candidateEmail={data.candidate_email}
            jobTitle={data.job_title}
            matchScore={data.ai_match_score}
            feedback={data.ai_feedback}
          />

          {/* Right Column: Visual and Binary Analytics */}
          <div className="flex flex-col gap-8">
            <ExplainabilityRadarChart data={data.assessment.skills_radar} />
            <BiasDetectionWidget 
              proctoringFlags={data.assessment.proctoring_flags}
              biasIndicator={data.bias_fairness_indicator}
              mcqScore={data.assessment.mcq_score}
              codingScore={data.assessment.coding_score}
            />
          </div>

        </div>

      </motion.div>
    </div>
  );
}
