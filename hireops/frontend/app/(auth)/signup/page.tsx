"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Lock, User, Building, ArrowRight, KeyRound } from "lucide-react";
import { fetchApi } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";

interface RegisterResponse {
  access_token: string;
  token_type: string;
  user_id: number;
}

export default function SignupPage() {
  const router = useRouter();
  const [role, setRole] = useState<"CANDIDATE" | "HR" | "MANAGER">("CANDIDATE");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Shared form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Employer specific state
  const [companyName, setCompanyName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  
  const roleOptions = ["CANDIDATE", "HR", "MANAGER"] as const;
  const isEmployer = role !== "CANDIDATE";

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const payloadRole = role;
    const payload: Record<string, unknown> = {
      email,
      password,
      full_name: name,
      role: payloadRole,
    };

    if (payloadRole === "HR") {
      payload.company_name = companyName;
    } else if (payloadRole === "MANAGER") {
      payload.join_code = joinCode;
    }

    let registrationData: RegisterResponse | null = null;

    try {
      registrationData = await fetchApi<RegisterResponse>("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to register at this time.";
      console.error(err);
      setError(message);
      return;
    } finally {
      setIsLoading(false);
    }

    if (!registrationData) {
      setError("Unexpected response from the server.");
      return;
    }

    const token = registrationData.access_token;
    document.cookie = `hireops_session=${token}; path=/; max-age=86400; samesite=lax`;
    localStorage.setItem("token", token);

    const payloadBase64 = token.split(".")[1] ?? "";
    const decodedPayload = JSON.parse(
      atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/"))
    ) as {
      sub?: string;
      role?: string;
      company_id?: number | null;
      email?: string;
      full_name?: string;
    };

    useAuthStore.getState().setAuth({
      id: Number(decodedPayload.sub ?? 0),
      role: ((decodedPayload.role ?? "candidate").toLowerCase() as "candidate" | "hr" | "manager"),
      company_id: decodedPayload.company_id ?? null,
      email: decodedPayload.email,
      full_name: decodedPayload.full_name,
    });

    if (payloadRole === "HR") {
      router.push("/hr");
    } else if (payloadRole === "MANAGER") {
      router.push("/manager");
    } else {
      router.push("/candidate");
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">
        Create an account
      </h1>
      <p className="text-zinc-400 text-sm mb-6">
        Get started with HireOps in seconds.
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

      {/* Role selector */}
      <div className="relative flex w-full p-1 mb-8 bg-zinc-900 border border-zinc-800 rounded-lg">
        <motion.div
          layout
          className="absolute inset-0 m-1 rounded-md bg-white shadow-sm"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          style={{ width: `${100 / roleOptions.length}%`, left: `${(100 / roleOptions.length) * roleOptions.indexOf(role)}%` }}
        />
        {roleOptions.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setRole(option)}
            className={`flex-1 py-2 text-sm text-center transition-all relative ${role === option
              ? "text-black font-semibold"
              : "text-neutral-400 hover:text-neutral-200"
              }`}
          >
            {option === "HR" ? "HR" : option.charAt(0) + option.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        {/* Animated Form Fields */}
        <AnimatePresence mode="popLayout">
          {isEmployer && (
            <motion.div
              key="employer-fields"
              initial={{ opacity: 0, height: 0, scale: 0.95 }}
              animate={{ opacity: 1, height: "auto", scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 pb-1"
            >
              {role === "HR" ? (
                <div className="space-y-2 relative">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Company Name
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-3 h-5 w-5 text-zinc-600" />
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-transparent transition-all"
                      placeholder="Acme Corp"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2 relative">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Company Join Code
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3 h-5 w-5 text-zinc-600" />
                    <input
                      type="text"
                      required
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-transparent transition-all uppercase font-mono"
                      placeholder="HIRE-XXXXXX"
                    />
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Core Basic Details (Full Name, Email, Password) */}
          <motion.div
            key="core-fields"
            layout
            className="space-y-4"
            transition={{ duration: 0.2 }}
          >
            {/* Full Name */}
            <div className="space-y-2 relative">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-zinc-600" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-transparent transition-all"
                  placeholder="John Doe"
                />
              </div>
            </div>

            {/* Email Address */}
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
                  placeholder="you@company.com"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2 relative">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Password
              </label>
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

            {/* Submit Button */}
            <motion.button
              layout
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={isLoading}
              className="w-full relative flex items-center justify-center gap-2 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold py-2.5 rounded-lg text-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-4"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Complete Registration
                  <ArrowRight className="w-4 h-4 ml-1 opacity-70" />
                </>
              )}
            </motion.button>
          </motion.div>
        </AnimatePresence>
      </form>
    </div>
  );
}
