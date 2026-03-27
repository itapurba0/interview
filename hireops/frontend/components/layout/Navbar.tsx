"use client";

import { useState, useEffect } from "react";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { motion } from "framer-motion";
import { LogOut, AlertCircle } from "lucide-react";
import { fetchApi } from "@/lib/api";

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [pendingAssessments, setPendingAssessments] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch pending assessments for candidates
  useEffect(() => {
    if (!mounted || !isAuthenticated || user?.role !== "candidate") return;

    let cancelled = false;

    async function checkPendingAssessments() {
      try {
        const appsRes = await fetchApi<any>("/api/v1/applications");
        if (!cancelled && Array.isArray(appsRes)) {
          const pending = appsRes.filter((app: any) =>
            ["TEST_PENDING", "VOICE_PENDING"].includes(app.status)
          ).length;
          setPendingAssessments(pending);
        }
      } catch (err) {
        console.error("Failed to fetch pending assessments:", err);
      }
    }

    checkPendingAssessments();
    return () => {
      cancelled = true;
    };
  }, [mounted, isAuthenticated, user?.role]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const role = user?.role; // "candidate" | "hr" | "manager"

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] group-hover:shadow-[0_0_25px_rgba(99,102,241,0.8)] transition-all">
            H
          </div>
          <span className="text-xl font-bold tracking-tight text-neutral-100 group-hover:text-white transition-colors">
            HireOps
          </span>
        </Link>

        {/* Links */}
        <nav className="hidden md:flex items-center gap-6">
          {mounted && (
            <>
              {!isAuthenticated && (
                <>
                  <NavLink href="/login">Login</NavLink>
                  <Link href="/signup">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold tracking-wide rounded-xl transition-colors shadow-[0_0_15px_rgba(99,102,241,0.3)] border border-indigo-500/30"
                    >
                      Sign Up
                    </motion.button>
                  </Link>
                </>
              )}

              {role === "candidate" && (
                <>
                  <NavLink href="/candidate" isActive={pathname === "/candidate"}>Job Board</NavLink>
                  <div className="relative">
                    <NavLink href="/candidate/assessment" isActive={pathname === "/candidate/assessment"}>My Assessments</NavLink>
                    {pendingAssessments > 0 && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="absolute -top-2 -right-4 px-2 py-1 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center gap-1"
                      >
                        <AlertCircle className="w-3 h-3" />
                        {pendingAssessments}
                      </motion.div>
                    )}
                  </div>
                  <NavLink href="/candidate/profile" isActive={pathname === "/candidate/profile"}>Profile</NavLink>
                </>
              )}

              {role === "hr" && (
                <>
                  <NavLink href="/hr">Pipeline Dashboard</NavLink>
                </>
              )}

              {role === "manager" && (
                <>
                  <NavLink href="/manager">Intelligence Hub</NavLink>
                </>
              )}
            </>
          )}
        </nav>

        {/* User actions */}
        <div className="flex items-center gap-4">
          {mounted && isAuthenticated && user && (
            <div className="flex items-center gap-4 pl-4 border-l border-neutral-800">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-bold text-neutral-300">
                  {user.id ? `User #${user.id}` : "Account"}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold">
                  {role}
                </span>
              </div>
              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: "rgba(239, 68, 68, 0.1)" }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="flex items-center justify-center w-9 h-9 text-neutral-400 hover:text-red-400 border border-neutral-800 hover:border-red-500/30 rounded-xl transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Reusable Nav Link with Hover Effect
// ---------------------------------------------------------------------------
function NavLink({ href, children, isActive = false }: { href: string; children: React.ReactNode; isActive?: boolean }) {
  return (
    <div className="relative group">
      <Link
        href={href}
        className={`text-sm font-medium transition-colors py-2 block ${isActive
            ? "text-indigo-300"
            : "text-neutral-400 group-hover:text-neutral-200"
          }`}
      >
        {children}
      </Link>
      {/* Animated underline */}
      <motion.div
        className={`absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 origin-left ${isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
          } transition-transform duration-300 ease-out`}
      />
    </div>
  );
}
