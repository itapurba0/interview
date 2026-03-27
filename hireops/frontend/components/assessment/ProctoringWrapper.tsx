"use client";

import { useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Maximize,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Ban,
  Eye,
  Clock,
  Lock,
  Camera,
  CameraOff,
  Loader2,
} from "lucide-react";
import { useProctoring } from "@/hooks/useProctoring";
import { FullScreenGuard } from "@/components/assessment/FullScreenGuard";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type WrapperPhase = "instructions" | "running";

export interface ProctoringWrapperProps {
  /** Display name for the test header */
  testName: string;
  /** Subtitle / context line (e.g. "Application #42") */
  subtitle?: string;
  /** Time limit in seconds (default 600 = 10 min) */
  timeLimitSeconds?: number;
  /** Max violation warnings before auto-submit (default 3) */
  maxWarnings?: number;
  /** Called each time a new violation is recorded. Receives the new count. */
  onViolation?: (count: number) => void;
  /** Called when the wrapper force-submits (timer ran out OR max violations hit) */
  onForceSubmit: () => void;
  /** The actual test UI to render inside the secure environment */
  children: ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ProctoringWrapper({
  testName,
  subtitle,
  timeLimitSeconds = 600,
  maxWarnings = 3,
  onViolation,
  onForceSubmit,
  children,
}: ProctoringWrapperProps) {
  const [phase, setPhase] = useState<WrapperPhase>("instructions");
  const [warnings, setWarnings] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(timeLimitSeconds);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Camera proctoring via existing hook
  const {
    isCameraActive,
    cameraBlocked,
    stream,
    warningCount: cameraWarnings,
  } = useProctoring({
    assessmentId: testName.replace(/\s+/g, "_").toLowerCase(),
    candidateId: "current_user",
    enabled: phase === "running",
  });

  const totalWarnings = warnings + cameraWarnings;

  // Refs for closure stability
  const hasForceSubmitted = useRef(false);
  const onForceSubmitRef = useRef(onForceSubmit);
  onForceSubmitRef.current = onForceSubmit;

  // Camera video ref for PiP
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);

  // Container ref — fullscreen targets THIS element, not document
  const containerRef = useRef<HTMLDivElement>(null);

  // Attach stream to PiP video
  useEffect(() => {
    if (pipVideoRef.current && stream) {
      pipVideoRef.current.srcObject = stream;
      pipVideoRef.current.play().catch(() => {});
    }
  }, [stream]);

  // ─── Full-Screen Tracking ──────────────────────────────────────
  useEffect(() => {
    if (phase !== "running") return;

    const handleFsChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullScreen(isFs);
      if (!isFs) {
        setWarnings((prev) => prev + 1);
      }
    };

    document.addEventListener("fullscreenchange", handleFsChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFsChange);
  }, [phase]);

  // ─── Tab-Switch Detection ──────────────────────────────────────
  useEffect(() => {
    if (phase !== "running") return;

    const handleVisibility = () => {
      if (document.hidden) {
        setWarnings((prev) => {
          const next = prev + 1;
          alert(
            `⚠️ WARNING ${next}/${maxWarnings}: You left the test environment. This violation has been recorded.`
          );
          return next;
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [phase, maxWarnings]);

  // ─── Block Right-Click / Copy / Paste ──────────────────────────
  useEffect(() => {
    if (phase !== "running") return;

    const block = (e: Event) => e.preventDefault();

    document.addEventListener("contextmenu", block);
    document.addEventListener("copy", block);
    document.addEventListener("paste", block);

    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("copy", block);
      document.removeEventListener("paste", block);
    };
  }, [phase]);

  // ─── Propagate Violations ──────────────────────────────────────
  useEffect(() => {
    if (totalWarnings > 0) {
      onViolation?.(totalWarnings);
    }

    if (totalWarnings >= maxWarnings && !hasForceSubmitted.current) {
      hasForceSubmitted.current = true;
      onForceSubmitRef.current();
    }
  }, [totalWarnings, maxWarnings, onViolation]);

  // ─── Timer Countdown ──────────────────────────────────────────
  useEffect(() => {
    if (phase !== "running") return;

    const tick = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(tick);
          if (!hasForceSubmitted.current) {
            hasForceSubmitted.current = true;
            onForceSubmitRef.current();
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(tick);
  }, [phase]);

  // ─── Full-Screen Helpers ───────────────────────────────────────
  const enterFullScreen = useCallback(async () => {
    try {
      const target = containerRef.current || document.documentElement;
      await target.requestFullscreen();
      setIsFullScreen(true);
    } catch (err) {
      console.error("Full-screen failed:", err);
    }
  }, []);

  const startTest = async () => {
    await enterFullScreen();
    setPhase("running");
  };

  // Format timer
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  // =====================================================================
  // INSTRUCTIONS PHASE
  // =====================================================================
  if (phase === "instructions") {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-8 relative overflow-hidden">
        {/* Ambient */}
        <div className="absolute top-[15%] right-[10%] w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute bottom-[15%] left-[10%] w-[500px] h-[500px] bg-red-600/5 rounded-full blur-[160px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative max-w-2xl w-full bg-neutral-900/60 border border-neutral-800/60 backdrop-blur-xl rounded-3xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-8 pb-6 border-b border-neutral-800/50 bg-neutral-900/40">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <ShieldAlert className="w-7 h-7 text-red-400" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-neutral-100 tracking-tight">
                  Proctored Assessment
                </h1>
                <p className="text-sm text-neutral-500 mt-0.5">
                  {testName}
                  {subtitle ? ` · ${subtitle}` : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Rules */}
          <div className="p-8 space-y-5">
            <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-[0.2em]">
              Exam Rules & Conditions
            </h2>

            <div className="space-y-3">
              {[
                {
                  icon: <Camera className="w-4 h-4" />,
                  color: "text-emerald-400",
                  bg: "bg-emerald-500/10 border-emerald-500/20",
                  text: "Your camera will be enabled. A live feed is monitored throughout.",
                },
                {
                  icon: <Maximize className="w-4 h-4" />,
                  color: "text-indigo-400",
                  bg: "bg-indigo-500/10 border-indigo-500/20",
                  text: "The test runs in full-screen mode. Exiting full screen is a violation.",
                },
                {
                  icon: <Eye className="w-4 h-4" />,
                  color: "text-amber-400",
                  bg: "bg-amber-500/10 border-amber-500/20",
                  text: "Tab switching and window changes are actively monitored.",
                },
                {
                  icon: <Ban className="w-4 h-4" />,
                  color: "text-red-400",
                  bg: "bg-red-500/10 border-red-500/20",
                  text: "Right-clicking, copy, and paste are disabled during the test.",
                },
                {
                  icon: <AlertTriangle className="w-4 h-4" />,
                  color: "text-orange-400",
                  bg: "bg-orange-500/10 border-orange-500/20",
                  text: `${maxWarnings} violations = automatic test submission and failure.`,
                },
                {
                  icon: <Clock className="w-4 h-4" />,
                  color: "text-cyan-400",
                  bg: "bg-cyan-500/10 border-cyan-500/20",
                  text: `You have ${Math.floor(timeLimitSeconds / 60)} minutes. The test auto-submits when time expires.`,
                },
                {
                  icon: <Lock className="w-4 h-4" />,
                  color: "text-violet-400",
                  bg: "bg-violet-500/10 border-violet-500/20",
                  text: "No external resources or AI tools. Answer from your own knowledge.",
                },
              ].map((rule, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.07 }}
                  className={`flex items-center gap-4 px-5 py-3.5 rounded-xl border ${rule.bg}`}
                >
                  <span className={rule.color}>{rule.icon}</span>
                  <p className="text-sm text-neutral-300 leading-relaxed">
                    {rule.text}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Info summary */}
            <div className="flex items-center gap-6 pt-2">
              <div className="px-4 py-2.5 bg-neutral-800/50 border border-neutral-700/40 rounded-xl">
                <p className="text-xs text-neutral-500 uppercase tracking-widest">
                  Time Limit
                </p>
                <p className="text-lg font-bold text-neutral-200">
                  {Math.floor(timeLimitSeconds / 60)} min
                </p>
              </div>
              <div className="px-4 py-2.5 bg-neutral-800/50 border border-neutral-700/40 rounded-xl">
                <p className="text-xs text-neutral-500 uppercase tracking-widest">
                  Max Violations
                </p>
                <p className="text-lg font-bold text-red-400">{maxWarnings}</p>
              </div>
            </div>

            {/* Camera blocked warning */}
            {cameraBlocked && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/5 border border-red-500/20">
                <CameraOff className="w-5 h-5 text-red-400" />
                <p className="text-xs text-red-300">
                  Camera access is blocked. Please enable it in your browser
                  settings and reload.
                </p>
              </div>
            )}

            {/* CTA */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={startTest}
              className="w-full flex items-center justify-center gap-3 mt-4 px-8 py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-xl font-bold text-sm tracking-wider shadow-[0_0_30px_rgba(79,70,229,0.3)] hover:shadow-[0_0_40px_rgba(79,70,229,0.5)] transition-all"
            >
              <Maximize className="w-5 h-5" />
              Enter Full Screen & Start Test
            </motion.button>

            <p className="text-center text-[11px] text-neutral-600 mt-2">
              By starting, you agree to our anti-cheat policy and proctoring
              terms.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // =====================================================================
  // RUNNING PHASE — Secure Environment wrapping children
  // =====================================================================
  return (
    <div ref={containerRef} className="min-h-screen h-screen w-full bg-neutral-950 flex flex-col select-none relative overflow-hidden">
      {/* Full-screen re-entry guard (uses existing component) */}
      <FullScreenGuard
        isFullScreen={isFullScreen}
        handleEnterFullScreen={enterFullScreen}
      />

      {/* Ambient */}
      <div className="absolute top-[15%] right-[5%] w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[15%] left-[5%] w-[500px] h-[500px] bg-emerald-600/5 rounded-full blur-[160px] pointer-events-none" />

      {/* ── Proctoring Top Bar ── */}
      <div className="sticky top-0 z-40 bg-neutral-950/90 backdrop-blur-lg border-b border-neutral-800/60">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-neutral-100 tracking-tight">
                {testName}
              </h1>
              {subtitle && (
                <p className="text-[10px] text-neutral-500 tracking-wide">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Warning badge */}
            {totalWarnings > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                <span className="text-xs font-bold text-red-400 tracking-wider">
                  {totalWarnings}/{maxWarnings}
                </span>
              </motion.div>
            )}

            {/* Proctored badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isCameraActive ? "bg-emerald-400" : "bg-red-400"
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isCameraActive ? "bg-emerald-500" : "bg-red-500"
                  }`}
                />
              </span>
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                Proctored
              </span>
            </div>

            {/* Timer */}
            <div
              className={`px-4 py-1.5 rounded-lg border text-sm font-mono font-bold tracking-widest ${
                secondsLeft <= 60
                  ? "bg-red-500/10 border-red-500/30 text-red-400 animate-pulse"
                  : secondsLeft <= 120
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  : "bg-neutral-800/60 border-neutral-700/40 text-neutral-300"
              }`}
            >
              {formatTime(secondsLeft)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content Area (split: children + camera PiP) ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: test content passed via children */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">{children}</div>

        {/* Right: floating camera PiP sidebar */}
        <div className="w-[220px] shrink-0 border-l border-neutral-800/40 bg-neutral-950/50 p-4 flex flex-col gap-4">
          {/* Camera Feed */}
          <div className="relative rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900/80 shadow-2xl">
            <video
              ref={pipVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-auto aspect-[4/3] object-cover bg-black"
              style={{ transform: "rotateY(180deg)" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
            <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 bg-black/60 border border-neutral-700/50 rounded-full backdrop-blur-sm">
              {isCameraActive ? (
                <Camera className="w-3 h-3 text-emerald-400" />
              ) : (
                <CameraOff className="w-3 h-3 text-red-400" />
              )}
              <span className="text-[9px] font-bold text-neutral-300 tracking-wider">
                LIVE
              </span>
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

          {/* Telemetry */}
          <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-xl p-3 space-y-2.5">
            <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
              Telemetry
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400">Camera</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isCameraActive
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                }`}
              >
                {isCameraActive ? "Active" : "Off"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400">Violations</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  totalWarnings === 0
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : totalWarnings < maxWarnings
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                }`}
              >
                {totalWarnings}/{maxWarnings}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400">Integrity</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  totalWarnings < 2
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                }`}
              >
                {totalWarnings < 2 ? "Clean" : "Flagged"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Violation Warning Toast ── */}
      <AnimatePresence>
        {totalWarnings > 0 && totalWarnings < maxWarnings && (
          <motion.div
            key={`warn-${totalWarnings}`}
            initial={{ opacity: 0, scale: 0.9, y: -40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[1000] px-8 py-5 rounded-2xl bg-red-950/90 border border-red-500/40 backdrop-blur-2xl shadow-[0_0_60px_rgba(239,68,68,0.5)] flex items-center gap-5 pointer-events-none"
          >
            <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-red-100 font-bold tracking-widest text-xs uppercase mb-1">
                ⚠ Security Violation Detected
              </p>
              <p className="text-red-400/80 text-xs tracking-wide">
                Warning {totalWarnings}/{maxWarnings} — auto-fail at{" "}
                {maxWarnings}.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
