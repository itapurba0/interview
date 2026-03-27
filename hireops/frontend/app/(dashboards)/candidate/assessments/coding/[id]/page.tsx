"use client";

import { useState, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Play,
  Send,
  Loader2,
  Terminal,
  FileCode2,
  CheckCircle2,
  XCircle,
  Trophy,
  ArrowLeft,
  ShieldAlert,
  BookOpen,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { ProctoringWrapper } from "@/components/assessment/ProctoringWrapper";

// ---------------------------------------------------------------------------
// Problem Definition (MVP — hardcoded FizzBuzz variant)
// ---------------------------------------------------------------------------
const PROBLEM = {
  title: "Two Sum",
  difficulty: "Medium",
  description: `Given an array of integers \`nums\` and an integer \`target\`, return the **indices** of the two numbers such that they add up to \`target\`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

You can return the answer in any order.`,
  examples: [
    {
      input: "nums = [2, 7, 11, 15], target = 9",
      output: "[0, 1]",
      explanation: "Because nums[0] + nums[1] == 9, we return [0, 1].",
    },
    {
      input: "nums = [3, 2, 4], target = 6",
      output: "[1, 2]",
      explanation: "Because nums[1] + nums[2] == 6, we return [1, 2].",
    },
    {
      input: "nums = [3, 3], target = 6",
      output: "[0, 1]",
      explanation: "",
    },
  ],
  constraints: [
    "2 ≤ nums.length ≤ 10⁴",
    "-10⁹ ≤ nums[i] ≤ 10⁹",
    "-10⁹ ≤ target ≤ 10⁹",
    "Only one valid answer exists.",
  ],
};

const STARTER_CODE = `def two_sum(nums, target):
    """
    :type nums: List[int]
    :type target: int
    :rtype: List[int]
    """
    # Your solution here
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []
`;

const MAX_WARNINGS = 3;

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------
export default function CodingTestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: applicationId } = use(params);
  const router = useRouter();

  const [code, setCode] = useState(STARTER_CODE);
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [violations, setViolations] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ─── Tab-Key Handler ─────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        const newCode =
          code.substring(0, start) + "  " + code.substring(end);
        setCode(newCode);

        // Restore cursor position after React re-render
        requestAnimationFrame(() => {
          textarea.selectionStart = start + 2;
          textarea.selectionEnd = start + 2;
        });
      }
    },
    [code]
  );

  // ─── Mock Code Execution ─────────────────────────────────────────
  const handleRunCode = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    setOutput(">>> Running test cases...\n");

    // Simulate execution delay
    await new Promise((r) => setTimeout(r, 800));
    setOutput((prev) => prev + "\n─── Test Case 1 ───\n");
    setOutput(
      (prev) =>
        prev +
        "Input:  nums = [2, 7, 11, 15], target = 9\nExpect: [0, 1]\nOutput: [0, 1]\n✅ PASS\n"
    );

    await new Promise((r) => setTimeout(r, 500));
    setOutput((prev) => prev + "\n─── Test Case 2 ───\n");
    setOutput(
      (prev) =>
        prev +
        "Input:  nums = [3, 2, 4], target = 6\nExpect: [1, 2]\nOutput: [1, 2]\n✅ PASS\n"
    );

    await new Promise((r) => setTimeout(r, 500));
    setOutput((prev) => prev + "\n─── Test Case 3 ───\n");
    setOutput(
      (prev) =>
        prev +
        "Input:  nums = [3, 3], target = 6\nExpect: [0, 1]\nOutput: [0, 1]\n✅ PASS\n"
    );

    await new Promise((r) => setTimeout(r, 300));
    setOutput(
      (prev) =>
        prev +
        "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n✅ All test cases passed! (3/3)\nExecution time: 0.024s\nMemory: 14.2 MB\n"
    );

    setIsRunning(false);
  }, [isRunning]);

  // ─── Submit Handler ──────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (isSubmitting || isCompleted) return;
    setIsSubmitting(true);
    setSubmitError(null);

    const score = 100; // MVP: mock full score

    try {
      await fetchApi(`/api/v1/applications/${applicationId}/coding`, {
        method: "PATCH",
        body: JSON.stringify({ score }),
      });
      setFinalScore(score);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save score.";
      console.error("Coding submit error:", err);
      setSubmitError(message);
      setFinalScore(score); // still show score
    }

    // Exit full screen safely
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch {
      /* ignore */
    }

    setIsSubmitting(false);
    setIsCompleted(true);
  }, [applicationId, isSubmitting, isCompleted]);

  // Track violations
  const handleViolationTick = useCallback((count: number) => {
    setViolations(count);
  }, []);

  // =====================================================================
  // SUBMITTING STATE
  // =====================================================================
  if (isSubmitting) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6 text-center"
        >
          <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-neutral-100 tracking-tight">
              Submitting Your Code
            </h2>
            <p className="text-sm text-neutral-500 mt-1">
              Running final evaluation and saving results…
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // =====================================================================
  // COMPLETED STATE
  // =====================================================================
  if (isCompleted) {
    const passed = finalScore >= 60;
    const autoFailed = violations >= MAX_WARNINGS;

    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute top-[20%] right-[10%] w-[400px] h-[400px] bg-emerald-600/5 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[20%] left-[10%] w-[400px] h-[400px] bg-indigo-600/5 rounded-full blur-[140px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative max-w-lg w-full bg-neutral-900/60 border border-neutral-800/60 backdrop-blur-xl rounded-3xl p-10 text-center space-y-6"
        >
          <div
            className={`mx-auto w-20 h-20 rounded-2xl flex items-center justify-center border ${
              autoFailed
                ? "bg-red-500/10 border-red-500/30"
                : passed
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-amber-500/10 border-amber-500/30"
            }`}
          >
            {autoFailed ? (
              <ShieldAlert className="w-10 h-10 text-red-400" />
            ) : (
              <Trophy
                className={`w-10 h-10 ${
                  passed ? "text-emerald-400" : "text-amber-400"
                }`}
              />
            )}
          </div>

          <h2 className="text-3xl font-semibold text-neutral-100 tracking-tight">
            {autoFailed
              ? "Assessment Terminated"
              : passed
              ? "Coding Assessment Passed!"
              : "Assessment Complete"}
          </h2>

          <p className="text-neutral-400 text-sm leading-relaxed">
            {autoFailed
              ? "Your test was automatically submitted due to exceeding the maximum number of security violations."
              : passed
              ? "Excellent work! Your solution passed all test cases. You'll advance to the next stage."
              : "Your code has been submitted for evaluation."}
          </p>

          {/* Score Cards */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="p-4 bg-neutral-800/40 border border-neutral-700/40 rounded-xl">
              <p className="text-2xl font-bold text-emerald-400">
                {Math.round(finalScore)}%
              </p>
              <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1">
                Score
              </p>
            </div>
            <div className="p-4 bg-neutral-800/40 border border-neutral-700/40 rounded-xl">
              <p className="text-2xl font-bold text-indigo-400">3/3</p>
              <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1">
                Tests Passed
              </p>
            </div>
            <div
              className={`p-4 rounded-xl border ${
                violations > 0
                  ? "bg-red-500/5 border-red-500/20"
                  : "bg-neutral-800/40 border-neutral-700/40"
              }`}
            >
              <p
                className={`text-2xl font-bold ${
                  violations > 0 ? "text-red-400" : "text-neutral-300"
                }`}
              >
                {violations}
              </p>
              <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1">
                Violations
              </p>
            </div>
          </div>

          {/* Test Results */}
          <div className="space-y-2 text-left mt-4">
            {PROBLEM.examples.map((ex, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm bg-emerald-500/5 border-emerald-500/20 text-emerald-300"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="font-medium">
                  Test Case {idx + 1}: {ex.input.substring(0, 40)}…
                </span>
              </div>
            ))}
          </div>

          {violations > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/5 border border-red-500/20 text-left">
              <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
              <p className="text-xs text-red-300 leading-relaxed">
                {violations} security violation{violations !== 1 ? "s" : ""}{" "}
                recorded.{" "}
                {autoFailed
                  ? "Test was auto-submitted."
                  : "These are logged on your record."}
              </p>
            </div>
          )}

          {submitError && (
            <p className="text-xs text-amber-400 mt-2">
              Note: Score saved locally but failed to sync — {submitError}
            </p>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push("/candidate/assessment")}
            className="mt-4 flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-sm tracking-wider hover:bg-indigo-500 transition-all shadow-[0_0_25px_rgba(79,70,229,0.3)]"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Dashboard
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // =====================================================================
  // ACTIVE TEST — Wrapped in ProctoringWrapper
  // =====================================================================
  return (
    <ProctoringWrapper
      testName="Technical Coding Assessment"
      subtitle={`Application #${applicationId}`}
      timeLimitSeconds={1800}
      maxWarnings={MAX_WARNINGS}
      onViolation={handleViolationTick}
      onForceSubmit={handleSubmit}
    >
      <div className="flex h-full">
        {/* ── LEFT PANE: Problem Description ── */}
        <div className="w-[38%] border-r border-neutral-800/40 overflow-y-auto custom-scrollbar bg-neutral-950/50">
          <div className="p-6 space-y-6">
            {/* Problem Header */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                  <BookOpen className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-neutral-100 tracking-tight">
                    {PROBLEM.title}
                  </h2>
                </div>
                <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[10px] text-amber-400 font-bold uppercase tracking-widest">
                  {PROBLEM.difficulty}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
              {PROBLEM.description}
            </div>

            {/* Examples */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
                Examples
              </h3>
              {PROBLEM.examples.map((ex, idx) => (
                <div
                  key={idx}
                  className="bg-neutral-900/60 border border-neutral-800/50 rounded-xl p-4 space-y-2"
                >
                  <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                    Example {idx + 1}
                  </p>
                  <div className="space-y-1">
                    <p className="text-sm text-neutral-300 font-mono">
                      <span className="text-neutral-500">Input: </span>
                      {ex.input}
                    </p>
                    <p className="text-sm text-neutral-300 font-mono">
                      <span className="text-neutral-500">Output: </span>
                      <span className="text-emerald-400">{ex.output}</span>
                    </p>
                    {ex.explanation && (
                      <p className="text-xs text-neutral-500 mt-1">
                        <span className="font-semibold">Explanation: </span>
                        {ex.explanation}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Constraints */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
                Constraints
              </h3>
              <ul className="space-y-1.5">
                {PROBLEM.constraints.map((c, i) => (
                  <li
                    key={i}
                    className="text-sm text-neutral-400 flex items-start gap-2"
                  >
                    <span className="text-indigo-500 mt-0.5">•</span>
                    <span className="font-mono text-xs">{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANE: Code Editor + Console ── */}
        <div className="flex-1 flex flex-col bg-neutral-950/80">
          {/* Editor Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800/40 bg-neutral-900/40">
            <div className="flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-neutral-400 tracking-wider">
                solution.py
              </span>
              <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[9px] text-emerald-400 font-bold tracking-widest">
                PYTHON
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Run Code */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleRunCode}
                disabled={isRunning}
                className="flex items-center gap-2 px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700/50 text-neutral-300 rounded-lg text-xs font-bold tracking-wider transition-all disabled:opacity-50"
              >
                {isRunning ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                {isRunning ? "Running…" : "Run Code"}
              </motion.button>

              {/* Submit */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleSubmit}
                className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold tracking-wider transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]"
              >
                <Send className="w-3.5 h-3.5" />
                Submit
              </motion.button>
            </div>
          </div>

          {/* Code Editor (textarea) */}
          <div className="flex-1 relative overflow-hidden">
            {/* Line numbers gutter */}
            <div className="absolute left-0 top-0 bottom-0 w-12 bg-neutral-900/60 border-r border-neutral-800/30 overflow-hidden pointer-events-none z-10">
              <div className="pt-5 px-2">
                {code.split("\n").map((_, i) => (
                  <div
                    key={i}
                    className="text-[11px] text-neutral-600 font-mono leading-[1.625rem] text-right pr-1"
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
            </div>

            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              className="w-full h-full bg-neutral-950/90 text-emerald-300/90 font-mono text-sm leading-[1.625rem] p-5 pl-14 outline-none resize-none caret-emerald-400 selection:bg-emerald-500/20"
              style={{ tabSize: 2 }}
            />
          </div>

          {/* Console Output */}
          <div className="h-[200px] border-t border-neutral-800/40 bg-neutral-900/50 flex flex-col">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-neutral-800/30 bg-neutral-900/30">
              <Terminal className="w-3.5 h-3.5 text-neutral-500" />
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                Console Output
              </span>
              {output && (
                <button
                  onClick={() => setOutput("")}
                  className="ml-auto text-[10px] text-neutral-600 hover:text-neutral-400 transition-colors font-bold tracking-wider"
                >
                  CLEAR
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {output ? (
                <pre className="text-xs text-neutral-400 font-mono whitespace-pre-wrap leading-relaxed">
                  {output}
                </pre>
              ) : (
                <p className="text-xs text-neutral-600 italic">
                  Click &quot;Run Code&quot; to execute your solution against
                  the test cases.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProctoringWrapper>
  );
}
