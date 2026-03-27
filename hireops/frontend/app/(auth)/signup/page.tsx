"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Lock, User, Building, ChevronDown, ArrowRight } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"candidate" | "employer">("candidate");
  const [isLoading, setIsLoading] = useState(false);

  // Shared form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Employer specific state
  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState<"hr" | "hiring_manager">("hr");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate backend fetch delay for registration
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // After "successful registration", automatically log them in
    const activeRole = activeTab === "candidate" ? "candidate" : role;
    const payload = JSON.stringify({ role: activeRole });
    const base64Payload = btoa(payload).replace(/=/g, ''); 
    const mockJWT = `fakeHeader.${base64Payload}.fakeSignature`;

    document.cookie = `hireops_session=${mockJWT}; path=/; max-age=86400`;

    // Redirect to the newly established dashboard
    router.push(`/${activeRole === "hiring_manager" ? "manager" : activeRole}`);
  };

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">
        Create an account
      </h1>
      <p className="text-zinc-400 text-sm mb-6">
        Get started with HireOps in seconds.
      </p>

      {/* Modern Toggle Switch using Framer Motion */}
      <div className="relative flex p-1 mb-8 bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <button
          onClick={() => setActiveTab("candidate")}
          className={`relative z-10 w-1/2 py-2 text-sm font-medium transition-colors ${
            activeTab === "candidate" ? "text-zinc-950" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Candidate
        </button>
        <button
          onClick={() => setActiveTab("employer")}
          className={`relative z-10 w-1/2 py-2 text-sm font-medium transition-colors ${
            activeTab === "employer" ? "text-zinc-950" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          Employer
        </button>
        
        {/* Animated Background Indicator */}
        <motion.div
          className="absolute inset-1 bg-white rounded-md shadow-sm"
          initial={false}
          animate={{
            x: activeTab === "candidate" ? 0 : "100%",
            width: "calc(50% - 4px)",
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        {/* Animated Form Fields */}
        <AnimatePresence mode="popLayout">
          {activeTab === "employer" && (
            <motion.div
              key="employer-fields"
              initial={{ opacity: 0, height: 0, scale: 0.95 }}
              animate={{ opacity: 1, height: "auto", scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 pb-1"
            >
              {/* Company Input */}
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

              {/* Role Dropdown */}
              <div className="space-y-2 relative flex flex-col">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Your Role
                </label>
                <div className="relative">
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as "hr" | "hiring_manager")}
                    className="w-full appearance-none bg-zinc-900/50 border border-zinc-800 rounded-lg py-2.5 pl-4 pr-10 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-600 focus:border-transparent transition-all"
                  >
                    <option value="hr">HR Professional</option>
                    <option value="hiring_manager">Hiring Manager</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-zinc-500 pointer-events-none" />
                </div>
              </div>
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
