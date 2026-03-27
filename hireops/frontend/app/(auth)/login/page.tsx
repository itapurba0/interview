"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Lock, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // 1. Authenticate with real FastAPI backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: email, password: password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Authentication Failed");
      }

      const data = await response.json();
      const token = data.access_token;

      // 2. Persist the JWT securely in the browser environment
      document.cookie = `hireops_session=${token}; path=/; max-age=86400; samesite=lax`;
      localStorage.setItem("token", token); // Redundancy for local-only components

      // 3. Decode the JWT to hydrate the global Auth Store
      // format: header.payload.signature (take index 1)
      const payloadBase64 = token.split(".")[1];
      const decodedPayload = JSON.parse(atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/")));

      // Critical State: Hydrate the orchestrator with real backend roles/IDs
      login({
        id: parseInt(decodedPayload.sub),
        role: (decodedPayload.role).toLowerCase() as "candidate" | "hr" | "manager",
        company_id: decodedPayload.company_id,
      });

      // 4. Redirect to the respective role dashboard
      router.push(`/${decodedPayload.role.toLowerCase()}`);
    } catch (err: any) {
      console.error("Login sequence failed:", err);
      setError(err.message || "Unable to connect to the HireOps API. Please verify the backend is running on port 8000.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">
        Welcome back
      </h1 >
      <p className="text-zinc-400 text-sm mb-8">
        Enter your credentials to access your HireOps account.
      </p>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg"
        >
          <p className="text-sm text-red-400 font-medium">{error}</p>
        </motion.div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-2 relative">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-5 w-5 text-zinc-600" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-transparent transition-all"
              placeholder="you@company.com (hint: use 'hr@..' for HR)"
            />
          </div>
        </div>

        <div className="space-y-2 relative pb-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Password
            </label>
            <a href="#" className="text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors">
              Forgot password?
            </a>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-5 w-5 text-zinc-600" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-transparent transition-all"
              placeholder="••••••••"
            />
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          type="submit"
          disabled={isLoading}
          className="w-full relative flex items-center justify-center gap-2 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold py-2.5 rounded-lg text-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Sign In
              <ArrowRight className="w-4 h-4 ml-1 opacity-70" />
            </>
          )}
        </motion.button>
      </form>
    </div>
  );
}
