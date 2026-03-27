"use client";

import { ShieldAlert, Clock } from "lucide-react";

interface AssessmentTopBarProps {
  jobTitle: string;
  company: string;
  secondsLeft: number;
  isCameraActive: boolean;
  totalWarnings: number;
}

export function AssessmentTopBar({
  jobTitle,
  company,
  secondsLeft,
  isCameraActive,
  totalWarnings,
}: AssessmentTopBarProps) {
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className="sticky top-0 z-30 bg-neutral-950/80 border-b border-neutral-800/40 backdrop-blur-xl">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold text-neutral-100 tracking-tight">
            {jobTitle}
          </h1>
          <p className="text-xs text-neutral-500">
            {company} — Proctored Assessment
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Timer */}
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-mono font-bold ${
              secondsLeft < 120
                ? "bg-red-950/50 border-red-700/40 text-red-300"
                : "bg-neutral-900/60 border-neutral-800/50 text-neutral-300"
            }`}
          >
            <Clock className="w-4 h-4" />
            {formatTime(secondsLeft)}
          </div>

          {/* Proctoring Status */}
          <div className="flex items-center gap-2 px-4 py-2 bg-neutral-900/60 border border-neutral-800/50 rounded-full">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isCameraActive ? "bg-emerald-400" : "bg-red-400"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  isCameraActive ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
            </span>
            <span className="text-xs font-bold text-neutral-400 tracking-wider">
              {isCameraActive ? "SECURED" : "UNSECURED"}
            </span>
          </div>

          {/* Warning badge */}
          {totalWarnings > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-red-950/50 border border-red-700/40 rounded-full">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span className="text-xs font-bold text-red-300">
                {totalWarnings} {totalWarnings === 1 ? "Warning" : "Warnings"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
