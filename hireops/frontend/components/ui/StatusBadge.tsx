import * as React from "react";
import { XCircle, CheckCircle, Sparkles, FlaskConical, AlertTriangle } from "lucide-react";

export type ApplicationStatus =
  | "APPLIED"
  | "AI_SCREENING"
  | "TEST_PENDING"
  | "VOICE_PENDING"
  | "SHORTLISTED"
  | "REJECTED";

interface StatusBadgeProps {
  status: ApplicationStatus | string;
  className?: string;
  withIcon?: boolean;
}

export const StatusBadge = ({ status, className = "", withIcon = false }: StatusBadgeProps) => {
  // Map statuses to predefined CSS colors
  const getBadgeStyle = (s: string) => {
    switch (s) {
      case "REJECTED":
        return "bg-red-500/10 text-red-400 border border-red-500/20";
      case "SHORTLISTED":
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      case "TEST_PENDING":
        return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
      case "VOICE_PENDING":
        return "bg-violet-500/10 text-violet-400 border border-violet-500/20";
      case "AI_SCREENING":
        return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      case "APPLIED":
      default:
        return "bg-neutral-800/60 text-neutral-400 border border-neutral-700/40";
    }
  };

  const renderIcon = (s: string) => {
    if (!withIcon) return null;
    switch (s) {
      case "REJECTED": return <XCircle className="w-3 h-3" />;
      case "SHORTLISTED": return <CheckCircle className="w-3 h-3" />;
      case "TEST_PENDING": return <FlaskConical className="w-3 h-3" />;
      case "VOICE_PENDING": return <Sparkles className="w-3 h-3" />;
      case "AI_SCREENING": return <AlertTriangle className="w-3 h-3" />;
      default: return null;
    }
  };

  const label = status.replace("_", " ");

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] md:text-xs font-bold uppercase tracking-widest rounded-full ${getBadgeStyle(
        status
      )} ${className}`}
    >
      {renderIcon(status)}
      {label}
    </span>
  );
};
