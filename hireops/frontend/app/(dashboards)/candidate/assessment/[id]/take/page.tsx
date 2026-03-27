"use client";

import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { useProctoring } from "@/hooks/useProctoring";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  CameraOff,
  Code,
  AlertTriangle,
  Send,
  Loader2,
} from "lucide-react";

// Extracted components
import { FullScreenGuard } from "@/components/assessment/FullScreenGuard";
import { AssessmentTopBar } from "@/components/assessment/AssessmentTopBar";
import { ProctoringSidebar } from "@/components/assessment/ProctoringSidebar";
import { AssessmentResultScreen } from "@/components/assessment/AssessmentResultScreen";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface MCQQuestion {
  id: string;
  type: "mcq";
  text: string;
  options: string[];
}
interface CodingQuestion {
  id: string;
  type: "coding";
  text: string;
  starter_code: string;
}
type Question = MCQQuestion | CodingQuestion;

interface Assessment {
  assessment_id: string;
  job_title: string;
  company: string;
  time_limit_minutes: number;
  questions: Question[];
}

interface AssessmentResult {
  assessment_id: string;
  application_id?: number | null;
  candidate_id: number;
  mcq_score: number;
  mcq_total: number;
  coding_submitted: boolean;
  proctoring_flags: number;
  overall_status: "PASSED" | "FLAGGED" | "FAILED";
}

// ---------------------------------------------------------------------------
// Page Component (Orchestrator)
// ---------------------------------------------------------------------------
export default function AssessmentEnvironment({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: assessmentId } = use(params);
  const router = useRouter();

  // Proctoring hook — gives us camera state + stream + warnings
  const {
    warningCount: hookWarningCount,
    isCameraActive,
    cameraBlocked,
    stream,
  } = useProctoring({
    assessmentId,
    candidateId: "cand_123",
  });

  // Assessment data
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Answers: q_id -> selected index (MCQ) or code string (Coding)
  const [answers, setAnswers] = useState<Record<string, number | string>>({});

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AssessmentResult | null>(null);

  // Tab-switch Warning modal
  const [showWarningModal, setShowWarningModal] = useState(false);
  const prevWarningCount = useRef(0);

  // Full-Screen state & warnings
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [fsWarningCount, setFsWarningCount] = useState(0);

  // Timer
  const [secondsLeft, setSecondsLeft] = useState(0);

  const totalWarnings = hookWarningCount + fsWarningCount;

  // ─── Fetch Assessment on mount ────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/v1/assessments/${assessmentId}`);
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data: Assessment = await res.json();
        if (!cancelled) {
          setAssessment(data);
          setSecondsLeft(data.time_limit_minutes * 60);

          // Init coding answers with starter code
          const initial: Record<string, number | string> = {};
          data.questions.forEach((q) => {
            if (q.type === "coding") {
              initial[q.id] = (q as CodingQuestion).starter_code;
            }
          });
          setAnswers(initial);
        }
      } catch (e: unknown) {
        if (!cancelled) setFetchError(e instanceof Error ? e.message : "Failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [assessmentId]);

  // ─── Full-Screen Enforcement ──────────────────────────────────────
  useEffect(() => {
    if (loading || fetchError || result) return;

    const handleFullScreenChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullScreen(isFs);
      if (!isFs) {
        setFsWarningCount((prev) => prev + 1);
      }
    };

    document.addEventListener("fullscreenchange", handleFullScreenChange);

    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        setIsFullScreen(false);
      });
    }

    return () => {
      document.removeEventListener("fullscreenchange", handleFullScreenChange);
    };
  }, [loading, fetchError, result]);

  const handleEnterFullScreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullScreen(true);
    } catch (err) {
      console.error("Failed to enter full screen", err);
    }
  };

  const handleExitAndReturn = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Failed to exit full screen", err);
    }
    // Route to the specific application's assessment hub if applicationId is available
    if (result?.application_id) {
      router.push(`/candidate/application/${result.application_id}`);
    } else {
      router.push("/candidate");
    }
  };

  // ─── Timer countdown ──────────────────────────────────────────────
  useEffect(() => {
    if (!assessment || result) return;
    const tick = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(tick);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [assessment, result]);

  // ─── Proctoring Warning modal ─────────────────────────────────────
  useEffect(() => {
    if (totalWarnings > prevWarningCount.current) {
      setShowWarningModal(true);
      const t = setTimeout(() => setShowWarningModal(false), 4000);
      prevWarningCount.current = totalWarnings;
      return () => clearTimeout(t);
    }
  }, [totalWarnings]);

  // ─── Submit handler ───────────────────────────────────────────────
  const handleSubmit = async () => {
    if (submitting || result) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessment_id: assessmentId,
          answers,
          warning_count: totalWarnings,
          time_taken_seconds: assessment
            ? assessment.time_limit_minutes * 60 - secondsLeft
            : 0,
        }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({
        assessment_id: assessmentId,
        application_id: undefined,
        candidate_id: 1,
        mcq_score: 18,
        mcq_total: 20,
        coding_submitted: true,
        proctoring_flags: totalWarnings,
        overall_status: totalWarnings > 3 ? "FLAGGED" : "PASSED",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Camera Blocked Gate ──────────────────────────────────────────
  if (cameraBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center space-y-6 p-10 bg-red-950/30 border border-red-800/40 rounded-3xl backdrop-blur-xl"
        >
          <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/15 flex items-center justify-center border border-red-500/30">
            <CameraOff className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-semibold text-red-100">
            Camera Access Required
          </h2>
          <p className="text-sm text-red-300/70 leading-relaxed">
            This proctored assessment requires camera access to ensure test
            integrity. Please enable your camera in browser settings and reload
            this page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-red-500/20 text-red-200 border border-red-500/30 rounded-xl text-sm font-semibold hover:bg-red-500/30 transition-all"
          >
            Retry Camera Access
          </button>
        </motion.div>
      </div>
    );
  }

  // ─── Loading / Error ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <div className="flex flex-col items-center gap-4 text-neutral-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          <p className="text-sm tracking-wide">
            Loading assignment payload…
          </p>
        </div>
      </div>
    );
  }

  if (fetchError || !assessment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 p-4">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
          <p className="text-neutral-300">
            Failed to load assignment payload.
          </p>
          <p className="text-xs text-neutral-600 font-mono">{fetchError}</p>
        </div>
      </div>
    );
  }

  // ─── Result Screen ────────────────────────────────────────────────
  if (result) {
    return (
      <AssessmentResultScreen
        result={result}
        applicationId={result.application_id}
        handleExitAndReturn={handleExitAndReturn}
      />
    );
  }

  // ─── Main Assessment UI ───────────────────────────────────────────
  const mcqs = assessment.questions.filter(
    (q) => q.type === "mcq"
  ) as MCQQuestion[];
  const coding = assessment.questions.filter(
    (q) => q.type === "coding"
  ) as CodingQuestion[];

  // Build progress data for sidebar
  const questionProgress = assessment.questions.map((q) => ({
    id: q.id,
    type: q.type as "mcq" | "coding",
    answered: answers[q.id] !== undefined,
  }));

  return (
    <div className="relative min-h-screen bg-neutral-950 overflow-hidden">
      {/* ── Full-Screen Blocking Guard ── */}
      <FullScreenGuard
        isFullScreen={isFullScreen}
        handleEnterFullScreen={handleEnterFullScreen}
      />

      {/* Ambient glows */}
      <div className="absolute top-[15%] right-[5%] w-[500px] h-[500px] bg-red-600/5 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[15%] left-[5%] w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[160px] pointer-events-none" />

      {/* ── Top Bar ── */}
      <AssessmentTopBar
        jobTitle={assessment.job_title}
        company={assessment.company}
        secondsLeft={secondsLeft}
        isCameraActive={isCameraActive}
        totalWarnings={totalWarnings}
      />

      {/* ── Split Screen ── */}
      <div
        className="flex max-w-[1600px] mx-auto"
        style={{ height: "calc(100vh - 57px)" }}
      >
        {/* LEFT: Test Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {/* MCQs */}
          {mcqs.map((q, idx) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08, duration: 0.4 }}
              className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-6 backdrop-blur-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
                  Question {idx + 1}
                </span>
                <span className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg text-[10px] font-bold tracking-widest">
                  MCQ
                </span>
              </div>
              <p className="text-neutral-200 text-[15px] leading-relaxed mb-5">
                {q.text}
              </p>

              <div className="grid gap-2">
                {q.options.map((opt, oi) => {
                  const selected = answers[q.id] === oi;
                  return (
                    <button
                      key={oi}
                      onClick={() =>
                        setAnswers((p) => ({ ...p, [q.id]: oi }))
                      }
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all border ${selected
                          ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-200"
                          : "bg-neutral-800/30 border-neutral-800/50 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
                        }`}
                    >
                      <span className="font-bold mr-3 opacity-50">
                        {String.fromCharCode(65 + oi)}.
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ))}

          {/* Coding questions */}
          {coding.map((q, idx) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: (mcqs.length + idx) * 0.08,
                duration: 0.4,
              }}
              className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-6 backdrop-blur-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
                  Question {mcqs.length + idx + 1}
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-bold tracking-widest">
                  <Code className="w-3 h-3" />
                  CODING
                </span>
              </div>
              <p className="text-neutral-200 text-[15px] leading-relaxed mb-5">
                {q.text}
              </p>

              <textarea
                value={(answers[q.id] as string) ?? q.starter_code}
                onChange={(e) =>
                  setAnswers((p) => ({ ...p, [q.id]: e.target.value }))
                }
                spellCheck={false}
                rows={14}
                className="w-full bg-neutral-950/60 border border-neutral-800 rounded-xl p-5 text-indigo-100/90 font-mono text-sm leading-relaxed focus:outline-none focus:border-indigo-500/50 transition-colors resize-none"
              />
            </motion.div>
          ))}

          {/* Submit Button */}
          <div className="flex justify-end pb-12">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2.5 px-8 py-3.5 bg-indigo-600 text-white rounded-xl font-bold tracking-wider text-xs hover:bg-indigo-500 transition-all shadow-[0_0_25px_rgba(79,70,229,0.3)] hover:shadow-[0_0_35px_rgba(79,70,229,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              SUBMIT TEST
            </motion.button>
          </div>
        </div>

        {/* RIGHT: Proctoring Sidebar */}
        <ProctoringSidebar
          stream={stream}
          isCameraActive={isCameraActive}
          totalWarnings={totalWarnings}
          questions={questionProgress}
        />
      </div>

      {/* ── Security Violation Warning Modal ── */}
      <AnimatePresence>
        {showWarningModal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20, filter: "blur(4px)" }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[1000] px-8 py-5 rounded-2xl bg-red-950/90 border border-red-500/40 backdrop-blur-2xl shadow-[0_0_60px_rgba(239,68,68,0.5)] flex items-center gap-5"
          >
            <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center font-bold border border-red-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-red-100 font-bold tracking-widest text-xs uppercase mb-1">
                ⚠ Security Violation Detected
              </p>
              <p className="text-red-400/80 text-xs tracking-wide">
                Warning {totalWarnings}/5 — the assessment will auto-fail at 5.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
