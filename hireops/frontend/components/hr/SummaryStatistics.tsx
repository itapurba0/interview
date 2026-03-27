"use client";

import { motion } from "framer-motion";
import { Briefcase, Users, MessageCircle, BarChart3 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

interface SummaryStatisticsProps {
  totalJobs: number;
  totalApplicants: number;
  pendingInterviews: number;
}

export function SummaryStatistics({
  totalJobs,
  totalApplicants,
  pendingInterviews,
}: SummaryStatisticsProps) {
  const stats = [
    {
      label: "Total Active Roles",
      value: totalJobs,
      icon: <Briefcase className="w-5 h-5 text-indigo-400" />,
      color: "indigo",
    },
    {
      label: "Total Applicants",
      value: totalApplicants,
      icon: <Users className="w-5 h-5 text-emerald-400" />,
      color: "emerald",
    },
    {
      label: "Interviews Pending",
      value: pendingInterviews,
      icon: <MessageCircle className="w-5 h-5 text-amber-400" />,
      color: "amber",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {stats.map((stat, idx) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: idx * 0.1 }}
        >
          <GlassCard className="p-8 rounded-[2rem] flex items-center justify-between border border-neutral-800/40 hover:border-indigo-500/20 transition-all duration-300 group">
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em]">
                {stat.label}
              </p>
              <h4 className="text-4xl font-light tracking-tight text-neutral-100">
                {stat.value}
              </h4>
            </div>
            <div className={`w-12 h-12 rounded-2xl bg-neutral-950/60 border border-neutral-800 group-hover:border-indigo-500/30 flex items-center justify-center transition-all duration-500`}>
              {stat.icon}
            </div>
          </GlassCard>
        </motion.div>
      ))}
    </div>
  );
}
