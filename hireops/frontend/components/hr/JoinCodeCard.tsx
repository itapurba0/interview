"use client";

import { useState } from "react";
import { Copy, Check, KeyRound } from "lucide-react";
import { motion } from "framer-motion";

interface JoinCodeCardProps {
  joinCode: string;
}

export function JoinCodeCard({ joinCode }: JoinCodeCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm overflow-hidden relative group">
      {/* Background ambient glow effect */}
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-zinc-400">
            <KeyRound className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Workspace Join Code
            </h3>
          </div>
          <p className="text-sm text-zinc-400 max-w-sm">
            Share this secure code with Hiring Managers so they can register and link their accounts directly to your company workspace.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 bg-zinc-950/50 p-1.5 pl-4 rounded-xl border border-zinc-800/80 w-full sm:w-auto">
          <code className="text-sm sm:text-base font-mono font-bold text-zinc-200 tracking-wider select-all">
            {joinCode}
          </code>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all shadow-sm flex-shrink-0 min-w-[85px] justify-center ${
              copied 
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                : "bg-indigo-500 hover:bg-indigo-400 text-white border border-indigo-500/50"
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy
              </>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
