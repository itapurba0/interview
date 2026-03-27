import * as React from "react";

interface ScoreBadgeProps {
  score: number;
  className?: string;
}

export const ScoreBadge = ({ score, className = "" }: ScoreBadgeProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (score >= 75) return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    if (score > 0) return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    return "bg-neutral-800/50 text-neutral-500 border-neutral-700/30";
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider border shrink-0 ${getScoreColor(
        score
      )} ${className}`}
    >
      {score}%
    </span>
  );
};
