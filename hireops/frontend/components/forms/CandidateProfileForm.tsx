"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { fetchApi } from "@/lib/api";
import {
  Upload,
  Globe,
  Link,
  Plus,
  X,
  Tag,
  Loader2,
  CheckCircle2,
  FileText,
  User,
  Sparkles,
  AlertCircle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ProfileData {
  candidate_id: number;
  resume_filename: string | null;
  name: string | null;
  photo_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  skills: string[];
  profile_complete: boolean;
}

// ---------------------------------------------------------------------------
// Skill suggestions for autocomplete
// ---------------------------------------------------------------------------
const SKILL_SUGGESTIONS = [
  "Python", "JavaScript", "TypeScript", "React", "Next.js", "Node.js",
  "Go", "Rust", "Java", "C++", "Ruby", "Swift", "Kotlin",
  "PostgreSQL", "MongoDB", "Redis", "GraphQL", "REST",
  "AWS", "GCP", "Azure", "Docker", "Kubernetes", "Terraform",
  "PyTorch", "TensorFlow", "MLOps", "LangChain",
  "Git", "CI/CD", "Linux", "Agile", "System Design",
];

// ---------------------------------------------------------------------------
// CandidateProfileForm
// ---------------------------------------------------------------------------
export default function CandidateProfileForm({
  onComplete,
}: {
  onComplete?: () => void;
}) {
  const router = useRouter();

  // Form state
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeFilename, setResumeFilename] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [parseSuccess, setParseSuccess] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const skillInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch existing profile on mount ───────────────────────────
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await fetchApi<ProfileData>("/api/v1/candidates/profile", {
          credentials: "include",
        });
        if (data.resume_filename) setResumeFilename(data.resume_filename);
        if (data.name) setName(data.name);
        if (data.photo_url) setPhotoUrl(data.photo_url);
        if (data.github_url) setGithubUrl(data.github_url);
        if (data.linkedin_url) setLinkedinUrl(data.linkedin_url);
        if (data.skills.length) setSkills(data.skills);
      } catch {
        // First time — no profile yet
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // ── File handling ─────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate type
      const validTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!validTypes.includes(file.type)) {
        setError("Please upload a PDF or Word document.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("File must be under 5MB.");
        return;
      }
      setResumeFile(file);
      setResumeFilename(file.name);
      setError("");

      // Parse resume with backend AI
      parseResumeFile(file);
    }
  };

  const parseResumeFile = async (file: File) => {
    setIsParsing(true);
    setParseSuccess(false);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const data = await fetchApi<{
        resume_text: string;
        name: string | null;
        email: string | null;
        phone: string | null;
        github_url: string | null;
        linkedin_url: string | null;
        technical_skills: string[];
        soft_skills: string[];
        experience_years: number;
        education: Record<string, unknown>;
        overall_score: number;
      }>("/api/v1/candidates/me/resume", {
        method: "POST",
        body: formData,
        credentials: "include",
        // Note: Don't set Content-Type header; browser will auto-set with multipart/form-data boundary
      });

      // Auto-populate form fields from parsed resume data
      // Name auto-population
      if (data.name && !name) {
        setName(data.name);
      }

      // GitHub URL auto-population
      if (data.github_url && !githubUrl) {
        setGithubUrl(data.github_url);
      }

      // LinkedIn URL auto-population
      if (data.linkedin_url && !linkedinUrl) {
        setLinkedinUrl(data.linkedin_url);
      }

      // Technical skills auto-population
      if (data.technical_skills && data.technical_skills.length > 0) {
        setSkills((prev) => {
          const newSkills = [...prev];
          data.technical_skills.forEach((skill: string) => {
            if (!newSkills.includes(skill)) {
              newSkills.push(skill);
            }
          });
          return newSkills;
        });
      }

      // Show success message
      setParseSuccess(true);
      setTimeout(() => setParseSuccess(false), 4000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to parse resume";
      setError(errorMessage);
    } finally {
      setIsParsing(false);
    }
  };

  const removeResume = () => {
    setResumeFile(null);
    setResumeFilename(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Photo handling ────────────────────────────────────────────
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate type
      const validImageTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!validImageTypes.includes(file.type)) {
        setError("Please upload a JPEG, PNG, or WebP image.");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setError("Photo must be under 2MB.");
        return;
      }

      setPhotoFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError("");
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoUrl(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  // ── Skills management ─────────────────────────────────────────
  const addSkill = (skill?: string) => {
    const s = (skill || skillInput).trim();
    if (s && !skills.includes(s)) {
      setSkills((prev) => [...prev, s]);
    }
    setSkillInput("");
    setShowSuggestions(false);
  };

  const removeSkill = (skill: string) => {
    setSkills((prev) => prev.filter((s) => s !== skill));
  };

  const filteredSuggestions = SKILL_SUGGESTIONS.filter(
    (s) =>
      s.toLowerCase().includes(skillInput.toLowerCase()) &&
      !skills.includes(s)
  ).slice(0, 6);

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (skills.length === 0) {
      setError("Add at least one skill to your profile.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess(false);

    try {
      await fetchApi("/api/v1/candidates/profile", {
        method: "PUT",
        credentials: "include",
        body: JSON.stringify({
          resume_filename: resumeFilename,
          name: name || null,
          photo_url: photoUrl || null,
          github_url: githubUrl || null,
          linkedin_url: linkedinUrl || null,
          skills,
        }),
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        if (onComplete) {
          onComplete();
        } else {
          router.push("/candidate");
        }
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Server error");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Completion percentage ─────────────────────────────────────
  const completionSteps = [
    !!resumeFilename,
    !!name,
    !!githubUrl,
    !!linkedinUrl,
    skills.length > 0,
  ];
  const completionPercent = Math.round(
    (completionSteps.filter(Boolean).length / completionSteps.length) * 100
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-2xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <User className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-neutral-100">
              Profile Setup
            </h2>
            <p className="text-xs text-neutral-500">
              Complete your profile to start applying for jobs
            </p>
          </div>
        </div>

        {/* Completion badge */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className={`text-sm font-bold ${completionPercent === 100 ? "text-emerald-400" : "text-neutral-400"}`}>
              {completionPercent}%
            </span>
            <p className="text-[9px] text-neutral-600 uppercase tracking-widest">
              Complete
            </p>
          </div>
          <div className="w-10 h-10 relative">
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18" cy="18" r="15"
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="3"
              />
              <circle
                cx="18" cy="18" r="15"
                fill="none"
                stroke={completionPercent === 100 ? "#34d399" : "#818cf8"}
                strokeWidth="3"
                strokeDasharray={`${completionPercent * 0.94} 100`}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Form sections */}
      <div className="space-y-5">
        {/* ── Resume Upload ─────────────────────────────────────── */}
        <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5 backdrop-blur-sm">
          <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <FileText className="w-3 h-3" />
            Resume / CV
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileSelect}
            disabled={isParsing}
            className="hidden"
          />

          {resumeFilename ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-indigo-500/5 border border-indigo-500/15 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-200 font-medium truncate max-w-[300px]">
                      {resumeFilename}
                    </p>
                    <p className="text-[10px] text-neutral-500">
                      {resumeFile ? `${(resumeFile.size / 1024).toFixed(0)} KB` : "Uploaded"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={removeResume}
                  disabled={isParsing}
                  className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isParsing && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-xs text-indigo-400 bg-indigo-950/30 border border-indigo-500/20 rounded-xl px-3 py-2"
                >
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  ✨ Analyzing resume with AI…
                </motion.div>
              )}
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsing}
              className="w-full flex flex-col items-center justify-center py-8 border-2 border-dashed border-neutral-800/60 rounded-xl text-neutral-500 hover:border-indigo-500/30 hover:text-indigo-400 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">Upload Resume</span>
              <span className="text-[10px] text-neutral-600 mt-1">
                PDF or Word • Max 5MB
              </span>
            </motion.button>
          )}
        </div>

        {/* ── Full Name ─────────────────────────────────────────── */}
        <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5 backdrop-blur-sm">
          <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <User className="w-3 h-3" />
            Full Name
          </label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full bg-neutral-950/50 border border-neutral-800/50 rounded-xl pl-10 pr-4 py-3 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-indigo-500/40 transition-colors"
            />
            {name && (
              <CheckCircle2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
            )}
          </div>
        </div>

        {/* ── Profile Photo (Optional) ──────────────────────────── */}
        <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5 backdrop-blur-sm">
          <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
            <Upload className="w-3 h-3" />
            Profile Photo <span className="text-neutral-600">(Optional)</span>
          </label>

          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoSelect}
            className="hidden"
          />

          <div className="flex items-center gap-4">
            {/* Avatar Preview */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-2 border-indigo-500/20 flex items-center justify-center overflow-hidden shrink-0">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-10 h-10 text-neutral-600" />
                )}
              </div>
              {photoUrl && (
                <button
                  onClick={removePhoto}
                  className="absolute -top-2 -right-2 p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Upload Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => photoInputRef.current?.click()}
              className="flex-1 flex flex-col items-center justify-center py-6 border-2 border-dashed border-neutral-800/60 rounded-xl text-neutral-500 hover:border-indigo-500/30 hover:text-indigo-400 transition-all group"
            >
              <Upload className="w-5 h-5 mb-1.5 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium">Upload Photo</span>
              <span className="text-[9px] text-neutral-600 mt-0.5">
                JPG, PNG or WebP • Max 2MB
              </span>
            </motion.button>
          </div>
        </div>

        {/* ── GitHub URL ────────────────────────────────────────── */}
        <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5 backdrop-blur-sm">
          <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Globe className="w-3 h-3" />
            GitHub Profile
          </label>
          <div className="relative">
            <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
            <input
              type="url"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/username"
              className="w-full bg-neutral-950/50 border border-neutral-800/50 rounded-xl pl-10 pr-4 py-3 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-indigo-500/40 transition-colors"
            />
            {githubUrl && (
              <CheckCircle2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
            )}
          </div>
        </div>

        {/* ── LinkedIn URL ──────────────────────────────────────── */}
        <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5 backdrop-blur-sm">
          <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Link className="w-3 h-3" />
            LinkedIn Profile
          </label>
          <div className="relative">
            <Link className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
            <input
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/username"
              className="w-full bg-neutral-950/50 border border-neutral-800/50 rounded-xl pl-10 pr-4 py-3 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-indigo-500/40 transition-colors"
            />
            {linkedinUrl && (
              <CheckCircle2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
            )}
          </div>
        </div>

        {/* ── Skills ────────────────────────────────────────────── */}
        <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5 backdrop-blur-sm">
          <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            Technical Skills
          </label>

          {/* Skill tags */}
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              <AnimatePresence>
                {skills.map((s) => (
                  <motion.span
                    key={s}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex items-center gap-1 px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-[11px] text-indigo-300 font-medium"
                  >
                    <Tag className="w-3 h-3" />
                    {s}
                    <button
                      onClick={() => removeSkill(s)}
                      className="hover:text-red-400 transition-colors ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Input with suggestions */}
          <div className="relative">
            <div className="flex gap-2">
              <input
                ref={skillInputRef}
                type="text"
                value={skillInput}
                onChange={(e) => {
                  setSkillInput(e.target.value);
                  setShowSuggestions(e.target.value.length > 0);
                }}
                onFocus={() => skillInput.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                placeholder="Type a skill (e.g. Python, React)…"
                className="flex-1 bg-neutral-950/50 border border-neutral-800/50 rounded-xl px-4 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-indigo-500/40 transition-colors"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => addSkill()}
                className="px-4 py-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-xl hover:bg-indigo-600/30 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Autocomplete dropdown */}
            <AnimatePresence>
              {showSuggestions && filteredSuggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full left-0 right-12 mt-1 bg-neutral-900/95 border border-neutral-800/60 rounded-xl overflow-hidden z-20 shadow-2xl backdrop-blur-xl"
                >
                  {filteredSuggestions.map((s) => (
                    <button
                      key={s}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        addSkill(s);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-neutral-300 hover:bg-indigo-500/10 hover:text-indigo-300 transition-colors flex items-center gap-2"
                    >
                      <Tag className="w-3 h-3 text-neutral-600" />
                      {s}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <p className="text-[10px] text-neutral-600 mt-2">
            {skills.length} skill{skills.length !== 1 ? "s" : ""} added
            {skills.length === 0 && " — add at least 1 to continue"}
          </p>
        </div>

        {/* ── Error / Success ──────────────────────────────────── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-2 text-xs text-red-400 bg-red-950/30 border border-red-500/20 rounded-xl px-4 py-3"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}

          {parseSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-2 text-xs text-indigo-400 bg-indigo-950/30 border border-indigo-500/20 rounded-xl px-4 py-3"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Resume parsed successfully! Skills auto-populated.
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 rounded-xl px-4 py-3"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Profile updated successfully!
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Submit ────────────────────────────────────────────── */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={handleSubmit}
          disabled={submitting || skills.length === 0}
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm tracking-wider rounded-xl border border-indigo-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.15)]"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving Profile…
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Save Profile
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}
