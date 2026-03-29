"use client";

import { useCallback, useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronRight,
    ChevronLeft,
    Send,
    CheckCircle2,
    XCircle,
    Trophy,
    ArrowLeft,
    ShieldAlert,
    Loader2,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { ProctoringWrapper } from "@/components/assessment/ProctoringWrapper";

const MAX_WARNINGS = 3;

type MCQQuestion = {
    question: string;
    options: string[];
    correct_answer: string;
};

export default function MCQTestPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id: applicationId } = use(params);
    const router = useRouter();

    const [questions, setQuestions] = useState<MCQQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
    const [violations, setViolations] = useState(0);
    const [isGenerating, setIsGenerating] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [finalScore, setFinalScore] = useState(0);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const totalQuestions = questions.length;
    const answeredCount = Object.keys(selectedAnswers).length;
    const currentQuestion = questions[currentIndex];
    const progressPercent =
        totalQuestions === 0 ? 0 : ((currentIndex + 1) / totalQuestions) * 100;

    // Fetch the AI-generated MCQ set
    useEffect(() => {
        let cancelled = false;

        const fetchTest = async () => {
            setIsGenerating(true);
            setFetchError(null);

            try {
                const [payload] = await Promise.all([
                    fetchApi(`/api/v1/assessments/mcq/${applicationId}`),
                    new Promise((resolve) => setTimeout(resolve, 4500)),
                ]);
                if (cancelled) return;
                const fetchedQuestions = payload.questions ?? [];
                setQuestions(fetchedQuestions);
                setSelectedAnswers({});
                setCurrentIndex(0);
            } catch (err: unknown) {
                if (cancelled) return;
                const message =
                    err instanceof Error ? err.message : "Unable to load your personalized test.";
                setFetchError(message);
            } finally {
                if (!cancelled) {
                    setIsGenerating(false);
                }
            }
        };

        fetchTest();

        return () => {
            cancelled = true;
        };
    }, [applicationId]);

    const calculateScore = useCallback(() => {
        if (!questions.length) return 0;
        let correct = 0;
        questions.forEach((question, idx) => {
            if (selectedAnswers[idx] === question.correct_answer) {
                correct++;
            }
        });
        return (correct / questions.length) * 100;
    }, [questions, selectedAnswers]);

    const handleSubmit = useCallback(
        async (violationCount: number = violations) => {
            if (isSubmitting || isCompleted || !questions.length) return;
            setSubmitError(null);
            setIsSubmitting(true);

            const scorePercent = calculateScore();
            setFinalScore(scorePercent);

            try {
                await fetchApi(`/api/v1/applications/${applicationId}/mcq`, {
                    method: "PATCH",
                    body: JSON.stringify({ score: scorePercent }),
                });
                const nextStatus = violationCount > 0 ? "NEEDS_REVIEW" : "VOICE_PENDING";
                await fetchApi(`/api/v1/applications/${applicationId}/status`, {
                    method: "PATCH",
                    body: JSON.stringify({ status: nextStatus }),
                });
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : "Failed to save score.";
                console.error("MCQ submit error:", err);
                setSubmitError(message);
            } finally {
                setIsSubmitting(false);
            }

            try {
                if (document.fullscreenElement) {
                    await document.exitFullscreen();
                }
            } catch {
                /* ignore */
            }

            setIsCompleted(true);
            setTimeout(() => {
                router.push("/candidate/assessments");
            }, 1500);
        },
        [applicationId, calculateScore, isSubmitting, isCompleted, router, questions, violations]
    );

    const handleViolationTick = useCallback((count: number) => {
        setViolations(count);
    }, []);

    const selectAnswer = useCallback(
        (answer: string) => {
            if (isCompleted) return;
            setSelectedAnswers((prev) => ({ ...prev, [currentIndex]: answer }));
        },
        [currentIndex, isCompleted]
    );

    const goNext = () => {
        if (currentIndex < totalQuestions - 1) {
            setCurrentIndex((i) => i + 1);
        }
    };
    const goPrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex((i) => i - 1);
        }
    };

    if (isGenerating) {
        return (
            <ProctoringWrapper
                testName="MCQ Screening"
                subtitle={`Application #${applicationId}`}
                timeLimitSeconds={600}
                maxWarnings={MAX_WARNINGS}
                onViolation={handleViolationTick}
                onForceSubmit={handleSubmit}
            >
                <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
                    <div className="p-6 rounded-3xl bg-neutral-900/60 border border-neutral-800/60 shadow-lg">
                        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                    </div>
                    <p className="mt-6 text-lg text-neutral-200 max-w-xl">
                        ✨ AI is analyzing your resume and compiling your personalized 30-question assessment. This may take a minute...
                    </p>
                    {fetchError && (
                        <p className="mt-3 text-sm text-amber-400">{fetchError}</p>
                    )}
                </div>
            </ProctoringWrapper>
        );
    }

    if (!questions.length) {
        return (
            <ProctoringWrapper
                testName="MCQ Screening"
                subtitle={`Application #${applicationId}`}
                timeLimitSeconds={600}
                maxWarnings={MAX_WARNINGS}
                onViolation={handleViolationTick}
                onForceSubmit={handleSubmit}
            >
                <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
                    <p className="text-lg text-neutral-200">
                        {fetchError
                            ? fetchError
                            : "We couldn't find any questions for this application. Please return to the hub and try again."}
                    </p>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => router.push("/candidate/assessments")}
                        className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold tracking-wide"
                    >
                        Return to Hub
                    </motion.button>
                </div>
            </ProctoringWrapper>
        );
    }

    if (isSubmitting) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-6"
                >
                    <div className="p-5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
                    </div>
                    <div className="text-center">
                        <h2 className="text-xl font-semibold text-neutral-100">
                            Finalizing Your Assessment
                        </h2>
                        <p className="text-sm text-neutral-500 mt-1">Saving your score and preparing results…</p>
                    </div>
                </motion.div>
            </div>
        );
    }

    if (isCompleted) {
        const correctCount = questions.filter((question, idx) => selectedAnswers[idx] === question.correct_answer).length;
        const passed = finalScore >= 60;
        const autoFailed = violations >= MAX_WARNINGS;

        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-8 relative overflow-hidden">
                <div className="absolute top-[20%] right-[10%] w-[400px] h-[400px] bg-indigo-600/5 rounded-full blur-[140px] pointer-events-none" />
                <div className="absolute bottom-[20%] left-[10%] w-[400px] h-[400px] bg-emerald-600/5 rounded-full blur-[140px] pointer-events-none" />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="relative max-w-lg w-full bg-neutral-900/60 border border-neutral-800/60 backdrop-blur-xl rounded-3xl p-10 text-center space-y-6"
                >
                    <div
                        className={`mx-auto w-20 h-20 rounded-2xl flex items-center justify-center border ${autoFailed
                                ? "bg-red-500/10 border-red-500/30"
                                : passed
                                    ? "bg-emerald-500/10 border-emerald-500/30"
                                    : "bg-amber-500/10 border-amber-500/30"
                            }`}
                    >
                        {autoFailed ? (
                            <ShieldAlert className="w-10 h-10 text-red-400" />
                        ) : (
                            <Trophy className={`w-10 h-10 ${passed ? "text-emerald-400" : "text-amber-400"}`} />
                        )}
                    </div>

                    <h2 className="text-3xl font-semibold text-neutral-100 tracking-tight">
                        {autoFailed
                            ? "Assessment Terminated"
                            : passed
                                ? "Assessment Passed!"
                                : "Assessment Complete"}
                    </h2>

                    <p className="text-neutral-400 text-sm leading-relaxed">
                        {autoFailed
                            ? "Your test was automatically submitted due to exceeding the maximum number of security violations."
                            : passed
                                ? "Great work! Your score qualifies you for the next stage."
                                : "You've completed the screening. Our team will review your results."}
                    </p>

                    <div className="grid grid-cols-3 gap-4 mt-6">
                        <div className="p-4 bg-neutral-800/40 border border-neutral-700/40 rounded-xl">
                            <p className="text-2xl font-bold text-indigo-400">{Math.round(finalScore)}%</p>
                            <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1">Score</p>
                        </div>
                        <div className="p-4 bg-neutral-800/40 border border-neutral-700/40 rounded-xl">
                            <p className="text-2xl font-bold text-emerald-400">
                                {correctCount}/{totalQuestions}
                            </p>
                            <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1">Correct</p>
                        </div>
                        <div
                            className={`p-4 rounded-xl border ${violations > 0
                                    ? "bg-red-500/5 border-red-500/20"
                                    : "bg-neutral-800/40 border-neutral-700/40"
                                }`}
                        >
                            <p className={`text-2xl font-bold ${violations > 0 ? "text-red-400" : "text-neutral-300"}`}>
                                {violations}
                            </p>
                            <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1">Violations</p>
                        </div>
                    </div>

                    <div className="space-y-2 text-left mt-4">
                        {questions.map((question, idx) => {
                            const isCorrect = selectedAnswers[idx] === question.correct_answer;
                            return (
                                <div
                                    key={idx}
                                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm ${isCorrect
                                            ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-300"
                                            : "bg-red-500/5 border-red-500/20 text-red-300"
                                        }`}
                                >
                                    {isCorrect ? (
                                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    ) : (
                                        <XCircle className="w-4 h-4 shrink-0" />
                                    )}
                                    <span className="truncate font-medium">
                                        Q{idx + 1}: {question.question.length > 55 ? `${question.question.substring(0, 55)}…` : question.question}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {violations > 0 && (
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/5 border border-red-500/20 text-left">
                            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
                            <p className="text-xs text-red-300 leading-relaxed">
                                {violations} security violation{violations !== 1 ? "s" : ""} recorded. {autoFailed ? "Test was auto-submitted." : "These are logged on your record."}
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
                        onClick={() => router.push("/candidate/assessments")}
                        className="mt-4 flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-sm tracking-wider hover:bg-indigo-500 transition-all shadow-[0_0_25px_rgba(79,70,229,0.3)]"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Return to Dashboard
                    </motion.button>
                </motion.div>
            </div>
        );
    }

    return (
        <ProctoringWrapper
            testName="MCQ Screening"
            subtitle={`Application #${applicationId}`}
            timeLimitSeconds={600}
            maxWarnings={MAX_WARNINGS}
            onViolation={handleViolationTick}
            onForceSubmit={handleSubmit}
        >
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="max-w-2xl w-full">
                    <div className="mb-6 flex items-center gap-4">
                        <div className="flex-1 h-1.5 bg-neutral-800/60 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full"
                                animate={{ width: `${progressPercent}%` }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                            />
                        </div>
                        <span className="text-xs text-neutral-500 font-bold tracking-wider shrink-0">
                            {answeredCount}/{totalQuestions}
                        </span>
                    </div>

                    <AnimatePresence mode="wait">
                        {currentQuestion && (
                            <motion.div
                                key={currentIndex}
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -30 }}
                                transition={{ duration: 0.25 }}
                                className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-8 backdrop-blur-lg"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
                                        Question {currentIndex + 1}
                                    </span>
                                    <span className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg text-[10px] font-bold tracking-widest">
                                        MCQ
                                    </span>
                                </div>

                                <p className="text-neutral-200 text-lg leading-relaxed mb-8 font-medium">
                                    {currentQuestion.question}
                                </p>

                                <div className="grid gap-3">
                                    {currentQuestion.options.map((option, optionIndex) => {
                                        const selected = selectedAnswers[currentIndex] === option;
                                        return (
                                            <motion.button
                                                key={`${currentIndex}-${optionIndex}`}
                                                whileHover={{ scale: 1.01 }}
                                                whileTap={{ scale: 0.99 }}
                                                onClick={() => selectAnswer(option)}
                                                className={`w-full text-left px-5 py-4 rounded-xl text-sm transition-all border ${selected
                                                        ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-200 shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                                                        : "bg-neutral-800/30 border-neutral-800/50 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200 hover:bg-neutral-800/50"
                                                    }`}
                                            >
                                                <span
                                                    className={`inline-flex items-center justify-center w-7 h-7 rounded-lg mr-4 text-xs font-bold ${selected
                                                            ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                                                            : "bg-neutral-800 text-neutral-500 border border-neutral-700/50"
                                                        }`}
                                                >
                                                    {String.fromCharCode(65 + optionIndex)}
                                                </span>
                                                {option}
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex items-center justify-between mt-8">
                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={goPrev}
                            disabled={currentIndex === 0}
                            className="flex items-center gap-2 px-5 py-3 bg-neutral-800/50 border border-neutral-700/40 text-neutral-300 rounded-xl text-sm font-bold tracking-wider transition-all hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Previous
                        </motion.button>

                        <div className="flex items-center gap-2">
                            {questions.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentIndex(idx)}
                                    className={`w-3 h-3 rounded-full border transition-all ${idx === currentIndex
                                            ? "bg-indigo-500 border-indigo-400 scale-125 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                                            : selectedAnswers[idx]
                                                ? "bg-emerald-500/60 border-emerald-400/40"
                                                : "bg-neutral-800 border-neutral-700"
                                        }`}
                                />
                            ))}
                        </div>

                        {currentIndex < totalQuestions - 1 ? (
                            <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={goNext}
                                className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold tracking-wider transition-all hover:bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.2)]"
                            >
                                Next
                                <ChevronRight className="w-4 h-4" />
                            </motion.button>
                        ) : (
                            <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => handleSubmit(violations)}
                                disabled={answeredCount < totalQuestions}
                                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold tracking-wider transition-all hover:bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send className="w-4 h-4" />
                                Submit Test
                            </motion.button>
                        )}
                    </div>

                    {currentIndex === totalQuestions - 1 && answeredCount < totalQuestions && (
                        <p className="text-center text-xs text-amber-400/80 mt-4">
                            Answer all {totalQuestions} questions before submitting.
                        </p>
                    )}
                </div>
            </div>
        </ProctoringWrapper>
    );
}
