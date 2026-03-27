"use client";

import { motion, AnimatePresence, Variants } from "framer-motion";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

// Fluid, staggered variants for ultra-smooth rendering
const pageVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 20, 
    filter: "blur(6px)" // High-end portfolio blur reveal
  },
  enter: { 
    opacity: 1, 
    y: 0, 
    filter: "blur(0px)",
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as any, // Custom sleek easing curve for professional feel
      when: "beforeChildren",
      staggerChildren: 0.1
    }
  },
  exit: { 
    opacity: 0, 
    y: -15, 
    filter: "blur(4px)",
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as any
    }
  },
};

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial="hidden"
        animate="enter"
        exit="exit"
        variants={pageVariants}
        className="flex-1 flex flex-col w-full min-h-screen"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
