"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { CheckCircle, ArrowRight, PartyPopper } from "lucide-react";

export default function CongratulationsPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 relative overflow-hidden text-white">
            {/* Ambient Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="max-w-xl w-full text-center space-y-8 relative z-10"
            >
                {/* Success Icon */}
                <div className="flex justify-center">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                            type: "spring",
                            stiffness: 260,
                            damping: 20,
                            delay: 0.3
                        }}
                        className="w-24 h-24 bg-emerald-500/15 rounded-full flex items-center justify-center border border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.2)]"
                    >
                        <CheckCircle className="w-12 h-12 text-emerald-400" />
                    </motion.div>
                </div>

                {/* Text Content */}
                <div className="space-y-4">
                    <motion.h1
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-4xl md:text-5xl font-light tracking-tight text-white flex items-center justify-center gap-3"
                    >
                        Success! <PartyPopper className="w-8 h-8 text-indigo-400" />
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="text-lg text-neutral-400 font-light leading-relaxed"
                    >
                        Your interview is complete. Our AI Recruiter is finalizing your evaluation scorecard and our HR team will be in touch shortly.
                    </motion.p>
                </div>

                {/* Scorecard Preview Mock */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8 }}
                    className="p-6 rounded-3xl bg-neutral-900/40 border border-neutral-800/50 backdrop-blur-xl space-y-4 text-left"
                >
                    <div className="flex items-center justify-between border-b border-neutral-800/50 pb-3">
                        <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Initial Analysis</span>
                        <span className="text-[10px] text-indigo-400 font-mono bg-indigo-500/5 px-2 py-0.5 rounded-full border border-indigo-500/20">PROCESSING</span>
                    </div>
                    <div className="space-y-3">
                        <div className="h-2 w-full bg-neutral-800/50 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: "0%" }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500"
                            />
                        </div>
                        <p className="text-[10px] text-neutral-500 italic">
                            Analyzing sentiment, technical depth, and communication clarity factors...
                        </p>
                    </div>
                </motion.div>

                {/* Action Button */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                >
                    <button
                        onClick={() => router.push("/candidate/assessment")}
                        className="group flex items-center gap-2 px-8 py-4 bg-white text-black rounded-2xl font-bold text-sm tracking-wide transition-all hover:bg-neutral-200 active:scale-95"
                    >
                        Return to Dashboard
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>
                    <p className="mt-6 text-xs text-neutral-600">
                        You can view the status of your application in the "My Assessments" tab.
                    </p>
                </motion.div>
            </motion.div>
        </div>
    );
}
