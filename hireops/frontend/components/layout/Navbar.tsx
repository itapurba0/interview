"use client";

import { useState, useEffect } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { motion } from "framer-motion";
import { LogOut } from "lucide-react";

export function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
              {!user && (
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
                  <NavLink href="/candidate">Job Board</NavLink>
                  <NavLink href="/candidate/profile">Profile</NavLink>
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
          {mounted && user && (
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
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <div className="relative group">
      <Link
        href={href}
        className="text-sm font-medium text-neutral-400 group-hover:text-neutral-200 transition-colors py-2 block"
      >
        {children}
      </Link>
      {/* Animated underline */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out"
      />
    </div>
  );
}
