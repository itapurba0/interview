"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Terminal, Shield, Briefcase, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLogin = pathname?.includes("/login");

  return (
    <div className="flex min-h-screen bg-[#09090b] text-zinc-50 font-sans selection:bg-zinc-800 selection:text-zinc-50">
      {/* Left panel: Auth Form */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="flex items-center gap-2 mb-8">
              <div className="bg-zinc-800 p-2 rounded-lg border border-zinc-700/50">
                <Terminal className="w-6 h-6 text-zinc-300" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">HireOps</span>
            </div>

            {children}

            <div className="mt-8 text-center text-sm text-zinc-500">
              {isLogin ? (
                <p>
                  Don't have an account?{" "}
                  <Link href="/signup" className="font-medium text-zinc-300 hover:text-white transition-colors">
                    Sign up
                  </Link>
                </p>
              ) : (
                <p>
                  Already have an account?{" "}
                  <Link href="/login" className="font-medium text-zinc-300 hover:text-white transition-colors">
                    Log in
                  </Link>
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right panel: Animated Branding Background */}
      <div className="hidden lg:flex flex-col flex-1 relative bg-zinc-950 border-l border-zinc-800/50 overflow-hidden text-center justify-center items-center">
        {/* Subtle animated gradient background elements */}
        <motion.div 
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px]"
          animate={{
            x: [0, 50, 0],
            y: [0, -50, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px]"
          animate={{
            x: [0, -30, 0],
            y: [0, 40, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        
        {/* Branding foreground content */}
        <div className="relative z-10 p-12 max-w-lg text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-6">
              Evaluate skills, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-300 to-zinc-600">
                not resumes.
              </span>
            </h2>
            <p className="text-lg text-zinc-400 mb-8 leading-relaxed">
              Join the modern standard for engineering hires. AI-powered remote proctoring, immersive live coding, and objective telemetry.
            </p>

            <ul className="space-y-4">
              <li className="flex items-center text-zinc-300">
                <Shield className="w-5 h-5 mr-3 text-zinc-500" />
                <span>Enterprise-grade security and proctoring</span>
              </li>
              <li className="flex items-center text-zinc-300">
                <Terminal className="w-5 h-5 mr-3 text-zinc-500" />
                <span>Multi-language live execution environments</span>
              </li>
              <li className="flex items-center text-zinc-300">
                <Briefcase className="w-5 h-5 mr-3 text-zinc-500" />
                <span>Seamless integration with modern ATS pipelines</span>
              </li>
            </ul>
          </motion.div>
        </div>

        {/* Abstract code/grid overlay */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay pointer-events-none"></div>
      </div>
    </div>
  );
}
