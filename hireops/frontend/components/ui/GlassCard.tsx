import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";

export interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  glassStyle?: "default" | "emerald" | "red" | "amber" | "blue" | "violet";
}

export const GlassCard = ({
  children,
  className = "",
  glassStyle = "default",
  whileHover,
  ...rest
}: GlassCardProps) => {
  const getGlassColors = (s: string) => {
    switch (s) {
      case "emerald":
        return "bg-emerald-950/20 border-emerald-800/30";
      case "red":
        return "bg-red-950/20 border-red-800/30";
      case "amber":
        return "bg-amber-950/20 border-amber-800/30";
      case "blue":
        return "bg-blue-950/20 border-blue-800/30";
      case "violet":
        return "bg-violet-950/20 border-violet-800/30";
      case "default":
      default:
        return "bg-neutral-900/50 border-neutral-800/60";
    }
  };

  return (
    <motion.div
      className={`border rounded-2xl backdrop-blur-md shadow-xl ${getGlassColors(
        glassStyle
      )} ${className}`}
      // Apply default hover IF a custom whileHover isn't passed in
      whileHover={whileHover || { scale: 1.015, y: -2 }}
      {...rest}
    >
      {children}
    </motion.div>
  );
};
