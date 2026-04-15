"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, Variants, AnimatePresence } from "framer-motion";
import { Plus, Search, RefreshCw, LayoutGrid, Filter, Briefcase, Building } from "lucide-react";
import { fetchApi } from "@/lib/api";

import { ActiveJobCard } from "@/components/hr/ActiveJobCard";
import { SummaryStatistics } from "@/components/hr/SummaryStatistics";
import { CreateJobModal } from "@/components/hr/CreateJobModal";
import { JobDetailsModal } from "@/components/shared/JobDetailsModal";
import { JoinCodeCard } from "@/components/hr/JoinCodeCard";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface HRJob {
  id: number;
  title: string;
  description: string;
  skills: string[];
  is_active: boolean;
  applicant_count: number;
  interviews_pending: number;
  date_posted: string;
}

interface HRCompany {
  id: number;
  name: string;
  description: string;
  join_code: string;
}

// ---------------------------------------------------------------------------
// Animations
// ---------------------------------------------------------------------------
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
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
// HR Dashboard Overview (Orchestrator)
// ---------------------------------------------------------------------------
export default function HRDashboard() {
  const [jobs, setJobs] = useState<HRJob[]>([]);
  const [company, setCompany] = useState<HRCompany | null>(null);
  const [activeTab, setActiveTab] = useState<"roles" | "company">("roles");
  const [isLoading, setIsLoading] = useState(true);
  const [showJobModal, setShowJobModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<HRJob | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Fetch jobs from HR-specific analytics endpoint
  const fetchJobs = useCallback(async () => {
    try {
      const data = await fetchApi<HRJob[]>("/api/v1/jobs/hr");
      setJobs(data);
    } catch (err) {
      console.error("Failed to fetch HR jobs:", err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchMyCompany = useCallback(async () => {
    try {
      const data = await fetchApi<HRCompany>("/api/v1/auth/companies/me");
      setCompany(data);
    } catch (err) {
      console.error("Failed to fetch company details:", err);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    fetchMyCompany();
  }, [fetchJobs, fetchMyCompany]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchJobs();
  };

  const filteredJobs = jobs.filter((job) =>
    job.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Aggregates for Summary Statistics
  const totalApplicants = jobs.reduce((acc, j) => acc + j.applicant_count, 0);
  const totalInterviews = jobs.reduce((acc, j) => acc + j.interviews_pending, 0);

  return (
    <div className="flex flex-col flex-1 p-8 md:p-12 max-w-[1600px] mx-auto w-full relative min-h-screen">
      {/* Ambient backgrounds */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-600/[0.02] rounded-full blur-[250px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-600/[0.015] rounded-full blur-[200px] pointer-events-none" />

      <motion.div
        initial="hidden"
        animate="show"
        variants={containerVariants}
        className="space-y-12 relative z-10"
      >
        {/* Header Section */}
        <motion.div variants={fadeSlideUp} className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-light tracking-tight text-neutral-100">
              Active Roles
            </h1>
            <p className="text-neutral-400 text-lg font-light tracking-wide">
              Manage your hiring pipelines and talent acquisition intelligence.
            </p>
          </div>

          <div className="flex items-center gap-3">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search roles..." 
                  className="bg-neutral-900/40 border border-neutral-800/60 rounded-xl pl-10 pr-4 py-2.5 text-sm text-neutral-300 placeholder-neutral-700 focus:outline-none focus:border-indigo-500/40 w-64 transition-all"
                />
             </div>
             
             <motion.button
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
               onClick={handleRefresh}
               className="p-2.5 bg-neutral-900/40 border border-neutral-800/60 rounded-xl text-neutral-500 hover:text-indigo-400 transition-colors"
             >
               <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
             </motion.button>

              <motion.button
               whileHover={{ scale: 1.02 }}
               whileTap={{ scale: 0.98 }}
               onClick={() => setShowJobModal(true)}
               className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold tracking-wide rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.2)] transition-all"
             >
               <Plus className="w-4 h-4" />
               Post Job
             </motion.button>
          </div>
        </motion.div>

        {/* Navigation Tabs */}
        <motion.div variants={fadeSlideUp} className="flex gap-4 border-b border-neutral-800/60 pb-px">
           <button
             onClick={() => setActiveTab("roles")}
             className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === "roles" ? "border-indigo-500 text-neutral-100" : "border-transparent text-neutral-500 hover:text-neutral-300"}`}
           >
             <div className="flex items-center gap-2 px-2">
               <Briefcase className="w-4 h-4" />
               Active Roles
             </div>
           </button>
           <button
             onClick={() => setActiveTab("company")}
             className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === "company" ? "border-indigo-500 text-neutral-100" : "border-transparent text-neutral-500 hover:text-neutral-300"}`}
           >
             <div className="flex items-center gap-2 px-2">
               <Building className="w-4 h-4" />
               Workspace Settings
             </div>
           </button>
        </motion.div>

        <AnimatePresence mode="wait">
          {activeTab === "roles" ? (
            <motion.div 
              key="roles-tab" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }} 
              transition={{ duration: 0.2 }}
              className="space-y-12"
            >
              {/* Workspace Operations & Statistics */}
              <motion.div variants={fadeSlideUp}>
                <SummaryStatistics 
                  totalJobs={jobs.length}
                  totalApplicants={totalApplicants}
                  pendingInterviews={totalInterviews}
                />
              </motion.div>

        {/* Jobs Grid Section */}
        <motion.div variants={fadeSlideUp} className="space-y-6">
           <div className="flex items-center justify-between border-b border-neutral-800/40 pb-4">
              <div className="flex items-center gap-2 text-neutral-300 font-medium">
                <LayoutGrid className="w-4 h-4" />
                <span>Posted Vacancies</span>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold text-neutral-600 uppercase tracking-widest">
                 <span>Sort: Newest First</span>
                 <Filter className="w-3.5 h-3.5" />
              </div>
           </div>

           {isLoading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-48 rounded-[1.5rem] bg-neutral-900/40 border border-neutral-800/40 animate-pulse" />
                ))}
             </div>
           ) : filteredJobs.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredJobs.map((job) => (
                  <ActiveJobCard key={job.id} job={job} onViewDetails={setSelectedJob} />
                ))}
             </div>
           ) : (
               <div className="py-20 flex flex-col items-center justify-center border border-dashed border-neutral-800 rounded-[2rem] text-neutral-600 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                     <Plus className="w-8 h-8 opacity-20" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-light">No active roles found.</p>
                    <p className="text-sm">Post a job to begin building your intelligence pipeline.</p>
                  </div>
               </div>
             )}
          </motion.div>
        </motion.div>
        ) : (
          <motion.div 
            key="company-tab" 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }} 
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 xl:grid-cols-3 gap-6 pt-4"
          >
            <div className="xl:col-span-2 space-y-6">
               <div className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-8 shadow-sm">
                 <h2 className="text-xl font-semibold text-neutral-100 mb-8 flex items-center gap-2">
                   <Building className="w-5 h-5 text-indigo-400" />
                   Workspace Information
                 </h2>
                 {company ? (
                   <div className="space-y-8">
                     <div>
                       <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2.5">Company Name</label>
                       <div className="text-xl font-medium text-neutral-200">{company.name}</div>
                     </div>
                     <div>
                       <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2.5">Workspace Origin</label>
                       <p className="text-sm text-neutral-400 leading-relaxed max-w-2xl">{company.description}</p>
                     </div>
                   </div>
                 ) : (
                   <div className="text-sm border border-neutral-800 bg-neutral-900/50 p-6 rounded-xl flex items-center gap-3 text-neutral-400">
                     <RefreshCw className="w-4 h-4 animate-spin" />
                     Loading company metadata securely...
                   </div>
                 )}
               </div>
            </div>
            <div className="xl:col-span-1">
               <JoinCodeCard joinCode={company?.join_code || "LOADING..."} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>

      <CreateJobModal 
        isOpen={showJobModal} 
        onClose={() => setShowJobModal(false)} 
        onCreated={() => {
          fetchJobs();
          setShowJobModal(false);
        }}
      />

      {/* Conditionally rendered Job details modal for grid clicks */}
      <JobDetailsModal 
        isOpen={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        job={selectedJob}
        viewerRole="HR"
      />
    </div>
  );
}
