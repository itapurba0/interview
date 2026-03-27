"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, Variants } from "framer-motion";
import { 
  Timer, 
  ArrowLeft,
  CheckCircle2,
  Code2,
  BrainCircuit,
  ChevronRight,
  Lock
} from "lucide-react";

// --- Types ---
type AssessmentState = "PENDING" | "COMPLETED";

// --- Animation Variants ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function AssessmentHub() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  // Static mock states for demonstration (can be replaced with API calls later)
  const [mcqState, setMcqState] = useState<AssessmentState>("PENDING");
  const [codingState, setCodingState] = useState<AssessmentState>("PENDING");

  // Countdown Timer Logic
  const [timeLeft, setTimeLeft] = useState(72 * 60 * 60); // 72 hours in seconds

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleMCQClick = () => {
    if (mcqState === "PENDING") {
      router.push(`/candidate/assessment/${id}/lobby?type=mcq`);
    }
  };

  const handleCodingClick = () => {
    if (codingState === "PENDING") {
      router.push(`/candidate/assessment/${id}/lobby?type=coding`);
    }
  };

  return (
    <div className="flex flex-col flex-1 p-8 md:p-12 max-w-5xl mx-auto w-full">
      <motion.div initial="hidden" animate="show" variants={containerVariants} className="space-y-10">
        
        {/* Navigation & Header */}
        <motion.div variants={itemVariants} className="space-y-6">
          <button 
            onClick={() => router.push("/candidate")}
            className="flex items-center gap-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-2">
                <BrainCircuit className="w-3.5 h-3.5" />
                Assessment Hub
              </div>
              <h1 className="text-4xl md:text-5xl font-light tracking-tight text-neutral-100">
                Software Engineer
              </h1>
              <p className="text-neutral-400 text-lg font-light tracking-wide">
                Complete all required modules before the deadline to advance in the hiring pipeline.
              </p>
            </div>

            {/* Timer Pin */}
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-neutral-900/80 border border-neutral-800 shadow-xl backdrop-blur-md">
              <div className="p-2 bg-amber-500/10 rounded-xl">
                <Timer className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Time Remaining</div>
                <div className="text-xl font-mono text-neutral-200 tracking-tight">
                  {formatTime(timeLeft)}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="w-full h-px bg-neutral-800/50" />

        {/* Assessment Cards Grid */}
        <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* MCQ Assessment Card */}
          <motion.div 
            variants={itemVariants}
            className={`relative overflow-hidden group p-8 rounded-3xl backdrop-blur-md shadow-2xl flex flex-col justify-between border transition-all duration-500 ${
              mcqState === "COMPLETED" 
                ? "bg-emerald-950/10 border-emerald-900/30" 
                : "bg-neutral-900/50 border-neutral-800 hover:border-indigo-500/50"
            }`}
          >
            {mcqState === "COMPLETED" && (
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full -translate-y-1/2 translate-x-1/2" />
            )}
            
            <div className="z-10 space-y-4">
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-2xl ${mcqState === "COMPLETED" ? "bg-emerald-500/20 text-emerald-400" : "bg-indigo-500/20 text-indigo-400"}`}>
                  <BrainCircuit className="w-6 h-6" />
                </div>
                {mcqState === "COMPLETED" ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Completed
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-neutral-800 text-neutral-400 text-xs font-bold uppercase tracking-wider rounded-full">
                    30 Mins • 20 Qs
                  </span>
                )}
              </div>
              
              <div>
                <h3 className="text-2xl font-semibold text-neutral-100 tracking-tight mb-2">
                  MCQ Assessment
                </h3>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  Test your foundational knowledge and core engineering concepts. You will be monitored via proctoring during this assessment.
                </p>
              </div>
            </div>

            <div className="z-10 mt-8 pt-6 border-t border-neutral-800/50">
              {mcqState === "COMPLETED" ? (
                <button disabled className="w-full py-3 rounded-xl bg-neutral-800/50 text-neutral-500 font-semibold cursor-not-allowed">
                  Completed
                </button>
              ) : (
                <button 
                  onClick={handleMCQClick}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors shadow-lg shadow-indigo-500/25"
                >
                  Prepare for MCQ
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>

          {/* Coding Challenge Card */}
          <motion.div 
            variants={itemVariants}
            className={`relative overflow-hidden group p-8 rounded-3xl backdrop-blur-md shadow-2xl flex flex-col justify-between border transition-all duration-500 ${
              codingState === "COMPLETED" 
                ? "bg-emerald-950/10 border-emerald-900/30" 
                : "bg-neutral-900/50 border-neutral-800 hover:border-violet-500/50"
            }`}
          >
            {codingState === "COMPLETED" && (
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full -translate-y-1/2 translate-x-1/2" />
            )}
            
            <div className="z-10 space-y-4">
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-2xl ${codingState === "COMPLETED" ? "bg-emerald-500/20 text-emerald-400" : "bg-violet-500/20 text-violet-400"}`}>
                  <Code2 className="w-6 h-6" />
                </div>
                {codingState === "COMPLETED" ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Completed
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-neutral-800 text-neutral-400 text-xs font-bold uppercase tracking-wider rounded-full">
                    60 Mins • 2 Algorithms
                  </span>
                )}
              </div>
              
              <div>
                <h3 className="text-2xl font-semibold text-neutral-100 tracking-tight mb-2">
                  Coding Challenge
                </h3>
                <p className="text-neutral-400 text-sm leading-relaxed">
                  Solve complex algorithmic and data structure problems in our fully integrated IDE environment. Code is evaluated on performance and correctness.
                </p>
              </div>
            </div>

            <div className="z-10 mt-8 pt-6 border-t border-neutral-800/50">
              {codingState === "COMPLETED" ? (
                <button disabled className="w-full py-3 rounded-xl bg-neutral-800/50 text-neutral-500 font-semibold cursor-not-allowed">
                  Completed
                </button>
              ) : (
                <button 
                  onClick={handleCodingClick}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors shadow-lg shadow-violet-500/25"
                >
                  Enter Coding Environment
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>

        </motion.div>
      </motion.div>
    </div>
  );
}
