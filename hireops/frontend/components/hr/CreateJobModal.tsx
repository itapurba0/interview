"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, X, Briefcase, Loader2, Sparkles, Tag } from "lucide-react";
import { GlassModal } from "@/components/ui/GlassModal";
import { fetchApi } from "@/lib/api";

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const SUGGESTED_SKILLS = [
  "React", "Next.js", "TypeScript", "JavaScript", "Node.js", "Python", "Go", "Rust", 
  "Docker", "Kubernetes", "AWS", "PostgreSQL", "MongoDB", "Redis", "TailwindCSS", 
  "Framer Motion", "GraphQL", "Ruby on Rails", "Java", "C++", "Kotlin", "Swift",
  "System Design", "MLOps", "DevOps", "Cybersecurity", "Microservices", "TensorFlow", "PyTorch"
];

export function CreateJobModal({ isOpen, onClose, onCreated }: CreateJobModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSuggestions = SUGGESTED_SKILLS.filter(
    (s) => 
      s.toLowerCase().includes(skillInput.toLowerCase()) && 
      !skills.includes(s) &&
      skillInput.trim() !== ""
  ).slice(0, 5);

  const addSkill = (skill?: string) => {
    const s = (skill || skillInput).trim();
    if (s && !skills.includes(s)) {
      setSkills((prev) => [...prev, s]);
      setSkillInput("");
      setShowSuggestions(false);
    }
  };

  const removeSkill = (skill: string) => {
    setSkills((prev) => prev.filter((s) => s !== skill));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required.");
      return;
    }
    if (skills.length === 0) {
      setError("Add at least one required skill.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await fetchApi("/api/v1/jobs", {
        method: "POST",
        body: JSON.stringify({ title, description, skills }),
      });

      // Reset form
      setTitle("");
      setDescription("");
      setSkills([]);
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Server error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} className="p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-100">
                Post New Job
              </h2>
              <p className="text-xs text-neutral-500">
                Create a new listing for your hiring pipeline
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5 block">
                Job Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Senior Backend Engineer"
                className="w-full bg-neutral-950/60 border border-neutral-800/50 rounded-xl px-4 py-3 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5 block">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the role, responsibilities, and team..."
                rows={3}
                className="w-full bg-neutral-950/60 border border-neutral-800/50 rounded-xl px-4 py-3 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-indigo-500/50 transition-colors resize-none"
              />
            </div>

            {/* Skills */}
            <div className="relative">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5 block">
                Required Skills
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={skillInput}
                  onFocus={() => setShowSuggestions(true)}
                  onChange={(e) => {
                    setSkillInput(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSkill();
                    }
                  }}
                  placeholder="Type a skill + Enter"
                  className="flex-1 bg-neutral-950/60 border border-neutral-800/50 rounded-xl px-4 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
                <button
                  onClick={() => addSkill()}
                  className="px-4 py-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 text-xs font-bold rounded-xl hover:bg-indigo-600/30 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Suggestions Dropdown */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-2 bg-neutral-900/90 border border-neutral-800 rounded-xl py-2 shadow-2xl backdrop-blur-xl">
                  {filteredSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => addSkill(suggestion)}
                      className="w-full text-left px-4 py-2 text-sm text-neutral-300 hover:bg-indigo-500/20 hover:text-indigo-300 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {skills.map((s) => (
                    <span
                      key={s}
                      className="flex items-center gap-1 px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-[11px] text-indigo-300 font-medium"
                    >
                      <Tag className="w-3 h-3" />
                      {s}
                      <button onClick={() => removeSkill(s)} className="hover:text-red-400 transition-colors ml-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs text-red-400 bg-red-950/30 border border-red-500/20 rounded-xl px-4 py-2">
                {error}
              </p>
            )}

            {/* Submit */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm tracking-wider rounded-xl border border-indigo-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Publish Job
                </>
              )}
            </motion.button>
          </div>
        </GlassModal>
  );
}
