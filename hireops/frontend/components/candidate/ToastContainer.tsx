"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Sparkles } from "lucide-react";

export interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className={`pointer-events-auto flex items-center gap-3 px-5 py-3.5 rounded-xl border backdrop-blur-lg shadow-2xl text-sm font-medium ${
              t.type === "success"
                ? "bg-emerald-950/80 border-emerald-700/50 text-emerald-200"
                : t.type === "error"
                ? "bg-red-950/80 border-red-700/50 text-red-200"
                : "bg-zinc-900/80 border-zinc-700/50 text-zinc-200"
            }`}
          >
            {t.type === "success" && <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />}
            {t.type === "error" && <XCircle className="w-5 h-5 text-red-400 shrink-0" />}
            {t.type === "info" && <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />}
            <span>{t.message}</span>
            <button
              onClick={() => onDismiss(t.id)}
              className="ml-2 text-white/40 hover:text-white/80 transition-colors"
            >
              ✕
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
