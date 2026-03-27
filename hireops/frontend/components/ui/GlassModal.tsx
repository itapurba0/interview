import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string; // Additional classes for the inner panel
  hideCloseButton?: boolean;
}

export const GlassModal = ({
  isOpen,
  onClose,
  children,
  className = "max-w-xl",
  hideCloseButton = false,
}: GlassModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3 }}
          className={`w-full bg-neutral-900/95 border border-neutral-800/60 rounded-3xl p-8 backdrop-blur-2xl shadow-[0_30px_80px_rgba(0,0,0,0.6)] relative ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          {!hideCloseButton && (
            <button
              onClick={onClose}
              className="absolute top-5 right-5 text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {children}
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
};
