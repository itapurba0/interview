"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Camera, CameraOff, CheckCircle } from "lucide-react";

interface QuestionProgress {
  id: string;
  type: "mcq" | "coding";
  answered: boolean;
}

interface ProctoringSidebarProps {
  stream: MediaStream | null;
  isCameraActive: boolean;
  totalWarnings: number;
  questions: QuestionProgress[];
}

export function ProctoringSidebar({
  stream,
  isCameraActive,
  totalWarnings,
  questions,
}: ProctoringSidebarProps) {
  // Internal video ref — reacts to incoming stream via useEffect
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  return (
    <div className="w-[340px] border-l border-neutral-800/40 bg-neutral-950/50 p-6 flex flex-col gap-6 overflow-y-auto">
      {/* Live Camera Feed */}
      <div className="relative rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900/80 shadow-2xl">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-auto aspect-[4/3] object-cover bg-black"
          style={{ transform: "rotateY(180deg)" }}
        />
        {/* Camera overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black/60 border border-neutral-700/50 rounded-full backdrop-blur-sm">
            {isCameraActive ? (
              <Camera className="w-3 h-3 text-emerald-400" />
            ) : (
              <CameraOff className="w-3 h-3 text-red-400" />
            )}
            <span className="text-[10px] font-bold text-neutral-300 tracking-wider">
              LIVE
            </span>
          </div>
        </div>
        {/* Scanning bar */}
        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-indigo-500/20">
          <motion.div
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="h-full w-1/3 bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.8)]"
          />
        </div>
      </div>

      {/* Proctoring Telemetry Card */}
      <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5 space-y-4">
        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
          Proctoring Telemetry
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-400">Camera</span>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                isCameraActive
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}
            >
              {isCameraActive ? "Active" : "Inactive"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-400">Tab Switches</span>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                totalWarnings === 0
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : totalWarnings < 3
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}
            >
              {totalWarnings}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-400">Integrity</span>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                totalWarnings < 2
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}
            >
              {totalWarnings < 2 ? "Clean" : "Compromised"}
            </span>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5 space-y-3">
        <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
          Progress
        </h3>
        {questions.map((q, i) => (
          <div key={q.id} className="flex items-center gap-3">
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold border transition-colors ${
                q.answered
                  ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-300"
                  : "bg-neutral-800/40 border-neutral-800/60 text-neutral-600"
              }`}
            >
              {q.answered ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span
              className={`text-xs ${
                q.answered ? "text-neutral-300" : "text-neutral-600"
              }`}
            >
              {q.type === "mcq" ? "Multiple Choice" : "Coding Challenge"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
