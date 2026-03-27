"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Users, Calendar, BarChart2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

interface ActiveJobCardProps {
  job: {
    id: number;
    title: string;
    applicant_count: number;
    date_posted: string;
    is_active: boolean;
  };
}

export function ActiveJobCard({ job }: ActiveJobCardProps) {
  return (
    <Link href={`/hr/jobs/${job.id}`} className="group block">
      <GlassCard className="p-6 rounded-[1.5rem] border border-neutral-800/40 group-hover:border-indigo-500/30 transition-all duration-500 hover:bg-neutral-900/40 relative overflow-hidden h-full">
        {/* Hover Highlight */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500/0 via-indigo-500/40 to-indigo-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

        <div className="flex flex-col justify-between h-full space-y-4">
          <div className="space-y-1">
            <div className="flex justify-between items-start">
              <h3 className="text-xl text-neutral-100 font-semibold tracking-tight transition-colors group-hover:text-indigo-400">
                {job.title}
              </h3>
              <div className="p-2 transition-transform duration-300 group-hover:translate-x-1">
                <ChevronRight className="w-5 h-5 text-neutral-600 group-hover:text-indigo-400" />
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-xs font-bold text-neutral-500 uppercase tracking-widest mt-2">
               <span className="flex items-center gap-1.5">
                 <Calendar className="w-3.5 h-3.5" />
                 Posted {job.date_posted}
               </span>
               <span className="flex items-center gap-1.5 text-emerald-500/80">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                 Active
               </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-neutral-800/40">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-sm font-medium text-neutral-300">
                <span className="text-neutral-100">{job.applicant_count}</span> Applicants
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-950/60 border border-neutral-800 rounded-lg text-[10px] font-bold text-neutral-500 group-hover:text-neutral-300 transition-colors uppercase tracking-widest">
              Review Pipeline
            </div>
          </div>
        </div>
      </GlassCard>
    </Link>
  );
}
