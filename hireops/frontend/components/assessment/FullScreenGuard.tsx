"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Maximize } from "lucide-react";

interface FullScreenGuardProps {
  isFullScreen: boolean;
  handleEnterFullScreen: () => void;
}

export function FullScreenGuard({
  isFullScreen,
  handleEnterFullScreen,
}: FullScreenGuardProps) {
  return (
    <AnimatePresence>
      {!isFullScreen && (
        <motion.div
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: "blur(24px)" }}
          exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
          className="fixed inset-0 z-[9999] bg-neutral-950/90 flex items-center justify-center p-8"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="max-w-xl w-full bg-neutral-900 border border-neutral-800 rounded-[2.5rem] p-10 text-center space-y-8 shadow-[0_0_100px_rgba(0,0,0,0.8)]"
          >
            <div className="mx-auto w-24 h-24 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mb-6">
              <Maximize className="w-10 h-10 text-indigo-400" />
            </div>

            <div className="space-y-3 relative z-20">
              <h2 className="text-3xl font-light tracking-tight text-white">
                Full-Screen Required
              </h2>
              <p className="text-neutral-400 text-sm leading-relaxed max-w-sm mx-auto">
                To ensure testing integrity, you are required to remain in
                full-screen mode at all times. Leaving full-screen adds to your
                proctoring flags.
              </p>
            </div>

            <div className="pt-8 border-t border-neutral-800/50">
              <button
                onClick={handleEnterFullScreen}
                className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold text-lg hover:bg-indigo-500 hover:scale-[1.02] transition-all shadow-[0_0_30px_rgba(79,70,229,0.3)]"
              >
                Enter Full-Screen to Continue
              </button>
              <p className="text-xs text-neutral-500 mt-4 font-semibold uppercase tracking-widest">
                Failure to comply constitutes a test violation
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
