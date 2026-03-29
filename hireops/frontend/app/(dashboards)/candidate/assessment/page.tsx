"use client";

import { useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import { motion, Variants } from "framer-motion";
import {
    Loader2,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Building,
    Briefcase,
    ChevronRight,
    FlaskConical,
    BookOpen,
    Calendar,
    Mic,
} from "lucide-react";
import useSWR from "swr";
import { swrFetcher } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Company {
    id: number;
    name: string;
    description?: string;
}

interface Job {
    id: number;
    title: string;
    company: Company | string; // Can be object or string for backward compatibility
    description: string;
    skills: string[];
    is_active: boolean;
}

interface Application {
    id: number;
    candidate_id: number;
    job_id: number;
    status: string;
    match_score: number | null;
    mcq_score?: number | null;
    coding_score?: number | null;
    voice_score?: number | null;
    ai_feedback?: string | null;
    created_at: string;
    updated_at: string;
    job?: Job; // Will be populated after fetch
}

// ---------------------------------------------------------------------------
// Animation Variants
// ---------------------------------------------------------------------------
const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.08, delayChildren: 0.1 },
    },
};

const cardVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: {
        opacity: 1,
        y: 0,
        transition: { ease: "easeOut", duration: 0.5 },
    },
};

// ---------------------------------------------------------------------------
// Assessment Status Card
// ---------------------------------------------------------------------------
function AssessmentCard({ application, jobData, onStartTest }: {
    application: Application;
    jobData: Job | null;
    onStartTest: (type: "mcq" | "coding" | "voice", applicationId: number) => void;
}) {
    const statusColors: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
        TEST_PENDING: {
            bg: "bg-emerald-500/5",
            border: "border-emerald-500/30",
            text: "text-emerald-400",
            icon: <Clock className="w-4 h-4" />,
        },
        VOICE_PENDING: {
            bg: "bg-violet-500/5",
            border: "border-violet-500/30",
            text: "text-violet-400",
            icon: <Briefcase className="w-4 h-4" />,
        },
        REJECTED: {
            bg: "bg-red-500/5",
            border: "border-red-500/30",
            text: "text-red-400",
            icon: <AlertTriangle className="w-4 h-4" />,
        },
        APPLIED: {
            bg: "bg-blue-500/5",
            border: "border-blue-500/30",
            text: "text-blue-400",
            icon: <CheckCircle2 className="w-4 h-4" />,
        },
        SHORTLISTED: {
            bg: "bg-amber-500/5",
            border: "border-amber-500/30",
            text: "text-amber-400",
            icon: <CheckCircle2 className="w-4 h-4" />,
        },
        SCHEDULED: {
            bg: "bg-indigo-500/5",
            border: "border-indigo-500/30",
            text: "text-indigo-400",
            icon: <Calendar className="w-4 h-4" />,
        },
    };

    const statusConfig = statusColors[application.status] || statusColors.APPLIED;

    const isMcqDone = application.mcq_score !== null && application.mcq_score !== undefined;
    const isCodingDone = application.coding_score !== null && application.coding_score !== undefined;

    const getStatusLabel = (status: string) => {
        if (status === "REJECTED") {
            return "❌ REJECTED";
        }
        if (status === "VOICE_PENDING") {
            return "✓ APPROVED - VOICE INTERVIEW";
        }
        if (status === "SHORTLISTED") {
            return "⭐ SHORTLISTED";
        }
        if (isMcqDone && isCodingDone) {
            return "ASSESSMENTS COMPLETE";
        }
        if (isMcqDone && !isCodingDone) {
            return "MCQ PASSED - CODING PENDING";
        }
        return "APPLIED - AI SCREENING";
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    return (
        <motion.div
            variants={cardVariants}
            className={`relative p-6 rounded-2xl border backdrop-blur-lg transition-all group ${statusConfig.bg} ${statusConfig.border}`}
        >
            {/* Card Content */}
            <div className="flex items-start justify-between gap-6">
                {/* Left Section - Job Info */}
                <div className="flex-1 space-y-3">
                    <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${statusConfig.bg} border ${statusConfig.border}`}>
                            <Briefcase className={`w-5 h-5 ${statusConfig.text}`} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-neutral-100 tracking-tight">
                                {jobData?.title || "Job Title"}
                            </h3>
                            <p className="text-sm text-neutral-500 flex items-center gap-1 mt-1">
                                <Building className="w-3.5 h-3.5" />
                                {typeof jobData?.company === 'object' ? jobData.company?.name : jobData?.company || "Company"}
                            </p>
                        </div>
                    </div>

                    {/* Status & Date */}
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider ${statusConfig.bg} ${statusConfig.border} border ${statusConfig.text}`}>
                            {statusConfig.icon}
                            {getStatusLabel(application.status)}
                        </div>

                        <p className="text-xs text-neutral-500">
                            Applied: {formatDate(application.created_at)}
                        </p>

                        {application.match_score !== null && (
                            <div className="px-3 py-1.5 rounded-lg bg-neutral-800/40 border border-neutral-700/40 text-xs font-semibold text-neutral-300">
                                Match: {application.match_score}%
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Section - Action Button */}
                <div className="flex items-center gap-2">
                    {!isMcqDone && (
                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => onStartTest("mcq", application.id)}
                            className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:bg-emerald-400 transition-all whitespace-nowrap"
                        >
                            <FlaskConical className="w-4 h-4" />
                            Start MCQ Screening
                            <ChevronRight className="w-4 h-4 opacity-60" />
                        </motion.button>
                    )}

                    {isMcqDone && !isCodingDone && (
                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => onStartTest("coding", application.id)}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:bg-blue-400 transition-all whitespace-nowrap"
                        >
                            <FlaskConical className="w-4 h-4" />
                            Start Coding Test
                            <ChevronRight className="w-4 h-4 opacity-60" />
                        </motion.button>
                    )}

                    {isMcqDone && isCodingDone && application.status !== "VOICE_PENDING" && (
                        <div className={`px-6 py-3 rounded-xl font-bold text-sm whitespace-nowrap ${application.status === "REJECTED"
                            ? "text-red-400 bg-red-500/5 border border-red-500/30"
                            : application.status === "VOICE_PENDING"
                                ? "text-violet-400 bg-violet-500/5 border border-violet-500/30"
                                : application.status === "SHORTLISTED"
                                    ? "text-emerald-400 bg-emerald-500/5 border border-emerald-500/30"
                                    : "text-neutral-400 bg-neutral-800/20 border border-neutral-700/30"
                            }`}>
                            {application.status === "REJECTED"
                                ? "❌ Application Rejected"
                                : application.status === "VOICE_PENDING"
                                    ? "✓ Approved - Awaiting Voice Interview"
                                    : application.status === "SHORTLISTED"
                                        ? "⭐ Shortlisted"
                                        : "Tests Completed - Under Review"}
                        </div>
                    )}

                    {isMcqDone && isCodingDone && application.status === "VOICE_PENDING" && (
                        <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => onStartTest("voice", application.id)}
                            className="flex items-center gap-2 px-6 py-3 bg-violet-500 text-white rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:bg-violet-400 transition-all whitespace-nowrap"
                        >
                            <Mic className="w-4 h-4" />
                            Start AI Interview
                            <ChevronRight className="w-4 h-4 opacity-60" />
                        </motion.button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

// ---------------------------------------------------------------------------
// Main Assessment Hub
// ---------------------------------------------------------------------------
function AssessmentHubContent() {
    const router = useRouter();

    // SWR: fetch once, cache globally across tab switches
    const { data: rawApps, isLoading, error } = useSWR<Application[]>(
        "/api/v1/applications/me",
        swrFetcher,
        { revalidateOnFocus: false, dedupingInterval: 10000 }
    );

    // Derive sorted applications + jobs map from cached data
    const applications = useMemo(() => {
        if (!rawApps || !Array.isArray(rawApps)) return [];
        return [...rawApps].sort((a, b) => {
            const aIsPending = ["TEST_PENDING", "VOICE_PENDING"].includes(a.status) ? 0 : 1;
            const bIsPending = ["TEST_PENDING", "VOICE_PENDING"].includes(b.status) ? 0 : 1;
            return aIsPending - bIsPending;
        });
    }, [rawApps]);

    const jobs = useMemo(() => {
        const map: Record<number, Job> = {};
        applications.forEach((app) => {
            if (app.job) map[app.job_id] = app.job;
        });
        return map;
    }, [applications]);

    // Handle test start
    const handleStartTest = (type: "mcq" | "coding" | "voice", applicationId: number) => {
        if (type === "mcq") {
            router.push(`/candidate/assessments/mcq/${applicationId}`);
        } else if (type === "voice") {
            router.push(`/candidate/assessments/voice/${applicationId}`);
        } else {
            router.push(`/candidate/assessments/coding/${applicationId}`);
        }
    };

    // Loading state — only show when NO cached data at all
    if (isLoading && !rawApps) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-neutral-400">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                <p className="text-sm tracking-wide">Loading your assessments…</p>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
                <AlertTriangle className="w-10 h-10 text-amber-400" />
                <h2 className="text-xl font-medium text-neutral-200">Unable to Load Assessments</h2>
                <p className="text-sm text-neutral-500 max-w-md">{error instanceof Error ? error.message : String(error)}</p>
            </div>
        );
    }

    // Empty state
    if (applications.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
                <BookOpen className="w-12 h-12 text-neutral-600" />
                <h2 className="text-xl font-medium text-neutral-200">No Applications Yet</h2>
                <p className="text-sm text-neutral-500 max-w-md">
                    Apply for jobs on your dashboard and they will appear here when a test is assigned.
                </p>
                <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => router.push("/candidate")}
                    className="mt-4 px-6 py-3 bg-indigo-500 text-white rounded-xl font-bold text-sm hover:bg-indigo-400 transition-all"
                >
                    Back to Opportunities
                </motion.button>
            </div>
        );
    }

    return (
        <div className="flex flex-col flex-1 p-8 md:p-12 max-w-6xl mx-auto w-full">
            <motion.div initial="hidden" animate="show" variants={containerVariants} className="space-y-10">
                {/* Header */}
                <motion.div variants={cardVariants} className="space-y-2">
                    <h1 className="text-4xl md:text-5xl font-light tracking-tight text-neutral-100">
                        My Assessments
                    </h1>
                    <p className="text-neutral-400 text-lg font-light tracking-wide">
                        View your active applications and take pending tests.
                    </p>
                </motion.div>

                {/* Pending Assessments Section */}
                {applications.some((app) => ["TEST_PENDING", "VOICE_PENDING"].includes(app.status)) && (
                    <motion.div variants={cardVariants} className="space-y-4">
                        <h2 className="text-xl font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                            <Clock className="w-5 h-5" />
                            Pending Action
                        </h2>
                        <motion.div
                            variants={containerVariants}
                            className="space-y-4"
                        >
                            {applications
                                .filter((app) => ["TEST_PENDING", "VOICE_PENDING"].includes(app.status))
                                .map((app) => (
                                    <AssessmentCard
                                        key={app.id}
                                        application={app}
                                        jobData={jobs[app.job_id] || null}
                                        onStartTest={handleStartTest}
                                    />
                                ))}
                        </motion.div>
                    </motion.div>
                )}

                {/* Other Applications Section */}
                {applications.some((app) => !["TEST_PENDING", "VOICE_PENDING"].includes(app.status)) && (
                    <motion.div variants={cardVariants} className="space-y-4">
                        <h2 className="text-xl font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5" />
                            All Applications
                        </h2>
                        <motion.div
                            variants={containerVariants}
                            className="space-y-4"
                        >
                            {applications
                                .filter((app) => !["TEST_PENDING", "VOICE_PENDING"].includes(app.status))
                                .map((app) => (
                                    <AssessmentCard
                                        key={app.id}
                                        application={app}
                                        jobData={jobs[app.job_id] || null}
                                        onStartTest={handleStartTest}
                                    />
                                ))}
                        </motion.div>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}

export default function AssessmentHub() {
    return (
        <Suspense
            fallback={
                <div className="flex flex-col flex-1 items-center justify-center min-h-[60vh] gap-4 text-neutral-400 p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                    <p className="text-sm tracking-wide">Loading your assessments…</p>
                </div>
            }
        >
            <AssessmentHubContent />
        </Suspense>
    );
}
