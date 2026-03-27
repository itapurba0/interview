"use client";

import { ReactNode } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { BarChart3 } from "lucide-react";

const fadeSlideUp: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: "easeOut" },
  },
};

interface KanbanColumnProps {
  columnKey: string;
  label: string;
  icon: string;
  color: string;
  count: number;
  children: ReactNode;
  /** If true, uses the special dimmed red styling for the Rejected column */
  isRejected?: boolean;
  /** Fallback text shown when column is empty */
  emptyLabel?: string;
}

export function KanbanColumn({
  label,
  icon,
  color,
  count,
  children,
  isRejected = false,
  emptyLabel = "No candidates",
}: KanbanColumnProps) {
  // Column top-border accent color
  const getColumnAccent = (c: string) => {
    const map: Record<string, string> = {
      neutral: "border-t-neutral-600/50",
      amber: "border-t-amber-500/50",
      blue: "border-t-blue-500/50",
      violet: "border-t-violet-500/50",
      emerald: "border-t-emerald-500/50",
      red: "border-t-red-500/30",
    };
    return map[c] ?? "border-t-neutral-600/50";
  };

  // Count badge color
  const getCountBadge = (c: string) => {
    const map: Record<string, string> = {
      neutral: "bg-neutral-800/60 text-neutral-400 border-neutral-700/40",
      amber: "bg-amber-950/40 text-amber-400 border-amber-700/30",
      blue: "bg-blue-950/40 text-blue-400 border-blue-700/30",
      violet: "bg-violet-950/40 text-violet-400 border-violet-700/30",
      emerald: "bg-emerald-950/40 text-emerald-400 border-emerald-700/30",
      red: "bg-red-950/40 text-red-400/70 border-red-700/20",
    };
    return map[c] ?? "bg-neutral-800/60 text-neutral-400 border-neutral-700/40";
  };

  return (
    <motion.div
      variants={fadeSlideUp}
      className={`flex-shrink-0 w-[280px] rounded-2xl border border-t-2 ${getColumnAccent(
        color
      )} flex flex-col backdrop-blur-md min-h-0 ${
        isRejected
          ? "bg-red-950/10 border-red-500/10 opacity-70"
          : "bg-neutral-900/30 border-neutral-800/40"
      }`}
    >
      {/* Column header */}
      <div
        className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${
          isRejected ? "border-red-500/10" : "border-neutral-800/30"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">{icon}</span>
          <h3
            className={`text-[10px] font-bold tracking-[0.15em] uppercase ${
              isRejected ? "text-red-400/70" : "text-neutral-400"
            }`}
          >
            {label}
          </h3>
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getCountBadge(
            color
          )}`}
        >
          {count}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0">
        <AnimatePresence>{children}</AnimatePresence>

        {count === 0 && (
          <div
            className={`w-full py-8 flex flex-col items-center justify-center border border-dashed rounded-xl gap-2 ${
              isRejected
                ? "border-red-500/10"
                : "border-neutral-800/40 text-neutral-700"
            }`}
          >
            {!isRejected && <BarChart3 className="w-4 h-4" />}
            <span
              className={`text-[9px] font-bold uppercase tracking-widest ${
                isRejected ? "text-neutral-700" : ""
              }`}
            >
              {emptyLabel}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
