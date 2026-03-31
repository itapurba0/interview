"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
    Trash2,
    Zap,
    BookOpen,
    Building2,
    Mail,
    Phone,
    Heart,
    Briefcase,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ExperienceItem {
    job_title: string | null;
    company: string | null;
    start_date: string | null;
    end_date: string | null;
    responsibilities: string[];
}

interface EducationItem {
    degree: string | null;
    institution: string | null;
    graduation_year: number | null;
}

interface ProjectItem {
    name: string | null;
    description: string | null;
    tech_stack: string[];
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
    const [hasExistingResume, setHasExistingResume] = useState(false);
    const [name, setName] = useState("");
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [githubUrl, setGithubUrl] = useState("");
    const [linkedinUrl, setLinkedinUrl] = useState("");
    const [skills, setSkills] = useState<string[]>([]);
    const [skillInput, setSkillInput] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Nested array state from resume extraction
    const [experience, setExperience] = useState<ExperienceItem[]>([]);
    const [education, setEducation] = useState<EducationItem[]>([]);
    const [projects, setProjects] = useState<ProjectItem[]>([]);

    // Contact and summary info from resume extraction
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [professionalSummary, setProfessionalSummary] = useState("");
    const [softSkills, setSoftSkills] = useState<string[]>([]);
    const [softSkillInput, setSoftSkillInput] = useState("");
    const [yearsOfExperience, setYearsOfExperience] = useState<number | null>(null);
    const [showSoftSkillSuggestions, setShowSoftSkillSuggestions] = useState(false);

    // UI state
    const [isLoading, setIsLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const [success, setSuccess] = useState(false);
    const [parseSuccess, setParseSuccess] = useState(false);
    const [error, setError] = useState("");

    const fileInputRef = useRef<HTMLInputElement>(null);
    const skillInputRef = useRef<HTMLInputElement>(null);
    const softSkillInputRef = useRef<HTMLInputElement>(null);

    // ── Fetch existing profile on mount ───────────────────────────
    interface CandidateProfileApiResponse {
        id: number;
        email: string;
        full_name: string;
        phone?: string | null;
        professional_summary?: string | null;
        technical_skills?: string[] | null;
        soft_skills?: string[] | null;
        experience_years?: number | null;
        education?: {
            education_list?: EducationItem[];
        } | null;
        experience?: {
            experience_list?: ExperienceItem[];
        } | null;
        projects?: {
            projects_list?: ProjectItem[];
        } | null;
        resume_text?: string | null;
        github?: string | null;
        linkedin?: string | null;
    }

    const fetchProfileData = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await fetchApi<CandidateProfileApiResponse>("/api/v1/candidates/me", {
                method: "GET",
                credentials: "include",
            });

            if (!data) return;

            if (data.full_name) {
                setName(data.full_name);
            }
            if (data.email) {
                setEmail(data.email);
            }
            if (data.phone) {
                setPhone(data.phone);
            }
            if (data.professional_summary) {
                setProfessionalSummary(data.professional_summary);
            }
            if (data.github) {
                setGithubUrl(data.github);
            }
            if (data.linkedin) {
                setLinkedinUrl(data.linkedin);
            }
            if (data.technical_skills && data.technical_skills.length > 0) {
                setSkills(data.technical_skills);
            }
            if (data.soft_skills && data.soft_skills.length > 0) {
                setSoftSkills(data.soft_skills);
            }
            if (typeof data.experience_years === "number") {
                setYearsOfExperience(data.experience_years);
            }
            if (data.education?.education_list && data.education.education_list.length > 0) {
                setEducation(data.education.education_list);
            }
            if (data.experience?.experience_list && data.experience.experience_list.length > 0) {
                setExperience(data.experience.experience_list);
            }
            if (data.projects?.projects_list && data.projects.projects_list.length > 0) {
                setProjects(data.projects.projects_list);
            }
            if (data.resume_text) {
                setHasExistingResume(true);
                setResumeFilename("resume.pdf");
            }
        } catch (err: unknown) {
            console.error("Failed to load candidate profile", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProfileData();
    }, [fetchProfileData]);

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
                professional_summary: string | null;
                experience_years: number | null;
                education: EducationItem[];
                experience: ExperienceItem[];
                projects: ProjectItem[];
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

            // Populate nested arrays from comprehensive extraction
            if (
                (data as unknown as Record<string, unknown>).experience &&
                Array.isArray((data as unknown as Record<string, unknown>).experience)
            ) {
                setExperience(
                    ((data as unknown as Record<string, unknown>).experience as ExperienceItem[]) || []
                );
            }
            if (
                (data as unknown as Record<string, unknown>).education &&
                Array.isArray((data as unknown as Record<string, unknown>).education)
            ) {
                setEducation(
                    ((data as unknown as Record<string, unknown>).education as EducationItem[]) || []
                );
            }
            if (
                (data as unknown as Record<string, unknown>).projects &&
                Array.isArray((data as unknown as Record<string, unknown>).projects)
            ) {
                setProjects(
                    ((data as unknown as Record<string, unknown>).projects as ProjectItem[]) || []
                );
            }

            // Email, phone, and professional summary auto-population
            if (data.email && !email) {
                setEmail(data.email);
            }
            if (data.phone && !phone) {
                setPhone(data.phone);
            }
            if (data.professional_summary && !professionalSummary) {
                setProfessionalSummary(data.professional_summary);
            }

            // Soft skills auto-population
            if (data.soft_skills && data.soft_skills.length > 0) {
                setSoftSkills((prev) => {
                    const newSkills = [...prev];
                    data.soft_skills.forEach((skill: string) => {
                        if (!newSkills.includes(skill)) {
                            newSkills.push(skill);
                        }
                    });
                    return newSkills;
                });
            }

            // Years of experience auto-population
            if (data.experience_years && !yearsOfExperience) {
                setYearsOfExperience(data.experience_years);
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
        setHasExistingResume(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const replaceResume = () => {
        // Toggle back to upload mode
        setHasExistingResume(false);
        setResumeFile(null);
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

    const addSoftSkill = (skill?: string) => {
        const s = (skill || softSkillInput).trim();
        if (s && !softSkills.includes(s)) {
            setSoftSkills((prev) => [...prev, s]);
        }
        setSoftSkillInput("");
        setShowSoftSkillSuggestions(false);
    };

    const removeSoftSkill = (skill: string) => {
        setSoftSkills((prev) => prev.filter((s) => s !== skill));
    };

    const filteredSuggestions = SKILL_SUGGESTIONS.filter(
        (s) =>
            s.toLowerCase().includes(skillInput.toLowerCase()) &&
            !skills.includes(s)
    ).slice(0, 6);

    const SOFT_SKILL_SUGGESTIONS = [
        "Communication",
        "Leadership",
        "Teamwork",
        "Problem Solving",
        "Critical Thinking",
        "Creativity",
        "Adaptability",
        "Time Management",
        "Attention to Detail",
        "Collaboration",
        "Negotiation",
        "Conflict Resolution",
        "Public Speaking",
        "Presentation",
        "Decision Making",
        "Project Management",
        "Mentoring",
        "Coaching",
        "Emotional Intelligence",
        "Empathy",
    ];

    const filteredSoftSkillSuggestions = SOFT_SKILL_SUGGESTIONS.filter(
        (s) =>
            s.toLowerCase().includes(softSkillInput.toLowerCase()) &&
            !softSkills.includes(s)
    ).slice(0, 6);

    // ── Array Handlers ───────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleUpdateArrayItem = (
        setter: React.Dispatch<React.SetStateAction<any[]>>,
        array: any[],
        index: number,
        field: string,
        value: any
    ) => {
        const updated = [...array];
        updated[index] = { ...updated[index], [field]: value };
        setter(updated);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleRemoveArrayItem = (
        setter: React.Dispatch<React.SetStateAction<any[]>>,
        array: any[],
        index: number
    ) => {
        setter(array.filter((_, i) => i !== index));
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleAddArrayItem = (
        setter: React.Dispatch<React.SetStateAction<any[]>>,
        array: any[],
        emptyTemplate: any
    ) => {
        setter([...array, emptyTemplate]);
    };

    const handleRemoveResponsibility = (expIndex: number, respIndex: number) => {
        const updated = [...experience];
        updated[expIndex].responsibilities.splice(respIndex, 1);
        setExperience(updated);
    };

    const handleRemoveTechStack = (projIndex: number, techIndex: number) => {
        const updated = [...projects];
        updated[projIndex].tech_stack.splice(techIndex, 1);
        setProjects(updated);
    };

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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const profileData: Record<string, unknown> = {
                technical_skills: skills,
                soft_skills: softSkills,
            };

            // Add contact info if available
            if (email) {
                profileData.email = email;
            }
            if (phone) {
                profileData.phone = phone;
            }
            if (professionalSummary) {
                profileData.professional_summary = professionalSummary;
            }
            if (yearsOfExperience) {
                profileData.years_of_experience = yearsOfExperience;
            }

            // Include nested arrays if they have data
            if (experience.length > 0) {
                profileData.experience = experience;
            }
            if (education.length > 0) {
                profileData.education = education;
            }
            if (projects.length > 0) {
                profileData.projects = projects;
            }

            await fetchApi("/api/v1/candidates/me", {
                method: "PUT",
                credentials: "include",
                body: JSON.stringify(profileData),
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

                    {hasExistingResume && !resumeFile ? (
                        // "Resume saved" state with "Replace Resume" button
                        <div className="space-y-3">
                            <div className="flex items-center justify-between bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-4">
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-emerald-300">
                                            Resume saved to profile
                                        </p>
                                        <p className="text-xs text-neutral-500">
                                            Your resume has been parsed and skills extracted
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={replaceResume}
                                className="w-full py-2.5 bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/50 text-sm text-neutral-300 font-medium rounded-xl transition-colors"
                            >
                                Replace Resume
                            </motion.button>
                        </div>
                    ) : resumeFilename && !hasExistingResume ? (
                        // Upload in progress or file selected
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
                        // Default upload state
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

                {/* ── Work Experience ──────────────────────────────────── */}
                {experience.length > 0 && (
                    <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5 backdrop-blur-sm">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                            <Building2 className="w-3 h-3" />
                            Work Experience
                            <span className="ml-auto text-[8px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                ✨ AI Extracted
                            </span>
                        </label>

                        <div className="space-y-3">
                            {experience.map((exp, expIndex) => (
                                <motion.div
                                    key={expIndex}
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    className="bg-neutral-950/50 border border-neutral-800/30 rounded-xl p-4 space-y-3"
                                >
                                    {/* Job Title & Company Row */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            value={exp.job_title || ""}
                                            onChange={(e) =>
                                                handleUpdateArrayItem(
                                                    setExperience,
                                                    experience,
                                                    expIndex,
                                                    "job_title",
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Job Title"
                                            className="bg-neutral-900/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-indigo-500/40 transition-colors"
                                        />
                                        <input
                                            type="text"
                                            value={exp.company || ""}
                                            onChange={(e) =>
                                                handleUpdateArrayItem(
                                                    setExperience,
                                                    experience,
                                                    expIndex,
                                                    "company",
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Company"
                                            className="bg-neutral-900/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-indigo-500/40 transition-colors"
                                        />
                                    </div>

                                    {/* Start Date & End Date Row */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            value={exp.start_date || ""}
                                            onChange={(e) =>
                                                handleUpdateArrayItem(
                                                    setExperience,
                                                    experience,
                                                    expIndex,
                                                    "start_date",
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Start Date (e.g. Jan 2020)"
                                            className="bg-neutral-900/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-indigo-500/40 transition-colors"
                                        />
                                        <input
                                            type="text"
                                            value={exp.end_date || ""}
                                            onChange={(e) =>
                                                handleUpdateArrayItem(
                                                    setExperience,
                                                    experience,
                                                    expIndex,
                                                    "end_date",
                                                    e.target.value
                                                )
                                            }
                                            placeholder="End Date (present)"
                                            className="bg-neutral-900/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-indigo-500/40 transition-colors"
                                        />
                                    </div>

                                    {/* Responsibilities */}
                                    <div>
                                        <p className="text-[10px] font-semibold text-neutral-500 mb-2 uppercase tracking-widest">
                                            Responsibilities
                                        </p>
                                        <div className="space-y-1.5 mb-2">
                                            {exp.responsibilities &&
                                                exp.responsibilities.map((resp, respIndex) => (
                                                    <div
                                                        key={respIndex}
                                                        className="flex items-start gap-2 text-xs text-neutral-300 bg-neutral-900/30 rounded-lg px-2.5 py-1.5"
                                                    >
                                                        <span className="text-neutral-600 mt-0.5">•</span>
                                                        <span className="flex-1">{resp}</span>
                                                        <button
                                                            onClick={() =>
                                                                handleRemoveResponsibility(expIndex, respIndex)
                                                            }
                                                            className="text-neutral-500 hover:text-red-400 transition-colors shrink-0"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>

                                    {/* Remove Button */}
                                    <button
                                        onClick={() =>
                                            handleRemoveArrayItem(setExperience, experience, expIndex)
                                        }
                                        className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-red-400 hover:bg-red-950/20 rounded-lg transition-colors border border-red-500/10"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Remove Experience
                                    </button>
                                </motion.div>
                            ))}
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() =>
                                handleAddArrayItem(setExperience, experience, {
                                    job_title: "",
                                    company: "",
                                    start_date: "",
                                    end_date: "",
                                    responsibilities: [],
                                })
                            }
                            className="w-full mt-3 py-2 flex items-center justify-center gap-1.5 text-xs text-indigo-400 hover:bg-indigo-950/20 rounded-lg transition-colors border border-indigo-500/20"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add Experience
                        </motion.button>
                    </div>
                )}

                {/* ── Education ─────────────────────────────────────────── */}
                {education.length > 0 && (
                    <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5 backdrop-blur-sm">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                            <BookOpen className="w-3 h-3" />
                            Education
                            <span className="ml-auto text-[8px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                ✨ AI Extracted
                            </span>
                        </label>

                        <div className="space-y-3">
                            {education.map((edu, eduIndex) => (
                                <motion.div
                                    key={eduIndex}
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    className="bg-neutral-950/50 border border-neutral-800/30 rounded-xl p-4 space-y-3"
                                >
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            value={edu.degree || ""}
                                            onChange={(e) =>
                                                handleUpdateArrayItem(
                                                    setEducation,
                                                    education,
                                                    eduIndex,
                                                    "degree",
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Degree"
                                            className="bg-neutral-900/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-indigo-500/40 transition-colors"
                                        />
                                        <input
                                            type="text"
                                            value={edu.institution || ""}
                                            onChange={(e) =>
                                                handleUpdateArrayItem(
                                                    setEducation,
                                                    education,
                                                    eduIndex,
                                                    "institution",
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Institution"
                                            className="bg-neutral-900/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-indigo-500/40 transition-colors"
                                        />
                                    </div>

                                    <input
                                        type="number"
                                        value={edu.graduation_year || ""}
                                        onChange={(e) =>
                                            handleUpdateArrayItem(
                                                setEducation,
                                                education,
                                                eduIndex,
                                                "graduation_year",
                                                e.target.value ? parseInt(e.target.value) : null
                                            )
                                        }
                                        placeholder="Graduation Year"
                                        className="w-full bg-neutral-900/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-indigo-500/40 transition-colors"
                                    />

                                    <button
                                        onClick={() =>
                                            handleRemoveArrayItem(setEducation, education, eduIndex)
                                        }
                                        className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-red-400 hover:bg-red-950/20 rounded-lg transition-colors border border-red-500/10"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Remove Education
                                    </button>
                                </motion.div>
                            ))}
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() =>
                                handleAddArrayItem(setEducation, education, {
                                    degree: "",
                                    institution: "",
                                    graduation_year: null,
                                })
                            }
                            className="w-full mt-3 py-2 flex items-center justify-center gap-1.5 text-xs text-indigo-400 hover:bg-indigo-950/20 rounded-lg transition-colors border border-indigo-500/20"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add Education
                        </motion.button>
                    </div>
                )}

                {/* ── Projects ──────────────────────────────────────────── */}
                {projects.length > 0 && (
                    <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5 backdrop-blur-sm">
                        <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                            <Zap className="w-3 h-3" />
                            Projects
                            <span className="ml-auto text-[8px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                ✨ AI Extracted
                            </span>
                        </label>

                        <div className="space-y-3">
                            {projects.map((proj, projIndex) => (
                                <motion.div
                                    key={projIndex}
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    className="bg-neutral-950/50 border border-neutral-800/30 rounded-xl p-4 space-y-3"
                                >
                                    <input
                                        type="text"
                                        value={proj.name || ""}
                                        onChange={(e) =>
                                            handleUpdateArrayItem(
                                                setProjects,
                                                projects,
                                                projIndex,
                                                "name",
                                                e.target.value
                                            )
                                        }
                                        placeholder="Project Name"
                                        className="w-full bg-neutral-900/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-indigo-500/40 transition-colors"
                                    />

                                    <textarea
                                        value={proj.description || ""}
                                        onChange={(e) =>
                                            handleUpdateArrayItem(
                                                setProjects,
                                                projects,
                                                projIndex,
                                                "description",
                                                e.target.value
                                            )
                                        }
                                        placeholder="Project Description"
                                        className="w-full bg-neutral-900/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-indigo-500/40 transition-colors resize-none h-24"
                                    />

                                    {/* Tech Stack */}
                                    <div>
                                        <p className="text-[10px] font-semibold text-neutral-500 mb-2 uppercase tracking-widest">
                                            Technologies
                                        </p>
                                        <div className="flex flex-wrap gap-1.5 mb-2">
                                            {proj.tech_stack &&
                                                proj.tech_stack.map((tech, techIndex) => (
                                                    <span
                                                        key={techIndex}
                                                        className="flex items-center gap-1.5 px-2 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-[10px] text-indigo-300 font-medium"
                                                    >
                                                        <Tag className="w-2.5 h-2.5" />
                                                        {tech}
                                                        <button
                                                            onClick={() =>
                                                                handleRemoveTechStack(projIndex, techIndex)
                                                            }
                                                            className="hover:text-red-400 transition-colors ml-0.5"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </span>
                                                ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() =>
                                            handleRemoveArrayItem(setProjects, projects, projIndex)
                                        }
                                        className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-red-400 hover:bg-red-950/20 rounded-lg transition-colors border border-red-500/10"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Remove Project
                                    </button>
                                </motion.div>
                            ))}
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() =>
                                handleAddArrayItem(setProjects, projects, {
                                    name: "",
                                    description: "",
                                    tech_stack: [],
                                })
                            }
                            className="w-full mt-3 py-2 flex items-center justify-center gap-1.5 text-xs text-indigo-400 hover:bg-indigo-950/20 rounded-lg transition-colors border border-indigo-500/20"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Add Project
                        </motion.button>
                    </div>
                )}

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

                {/* ── Email ─────────────────────────────────────────────── */}
                <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5 backdrop-blur-sm">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <Mail className="w-3 h-3" />
                        Email
                        <span className="text-[9px] text-indigo-400 ml-1">✨ AI Extracted</span>
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your.email@example.com"
                        className="w-full bg-neutral-950/50 border border-neutral-800/50 rounded-xl px-4 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-indigo-500/40 transition-colors"
                    />
                    <p className="text-[10px] text-neutral-600 mt-2">
                        {email ? "✓ Email provided" : "Optional — auto-populated from resume"}
                    </p>
                </div>

                {/* ── Phone ─────────────────────────────────────────────── */}
                <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5 backdrop-blur-sm">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <Phone className="w-3 h-3" />
                        Phone
                        <span className="text-[9px] text-indigo-400 ml-1">✨ AI Extracted</span>
                    </label>
                    <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (555) 123-4567"
                        className="w-full bg-neutral-950/50 border border-neutral-800/50 rounded-xl px-4 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-indigo-500/40 transition-colors"
                    />
                    <p className="text-[10px] text-neutral-600 mt-2">
                        {phone ? "✓ Phone provided" : "Optional — auto-populated from resume"}
                    </p>
                </div>

                {/* ── Professional Summary ───────────────────────────────── */}
                <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5 backdrop-blur-sm">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <FileText className="w-3 h-3" />
                        Professional Summary
                        <span className="text-[9px] text-indigo-400 ml-1">✨ AI Extracted</span>
                    </label>
                    <textarea
                        value={professionalSummary}
                        onChange={(e) => setProfessionalSummary(e.target.value)}
                        placeholder="Write a brief professional summary..."
                        rows={4}
                        className="w-full bg-neutral-950/50 border border-neutral-800/50 rounded-xl px-4 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-indigo-500/40 transition-colors resize-none"
                    />
                    <p className="text-[10px] text-neutral-600 mt-2">
                        {professionalSummary.length > 0
                            ? `${professionalSummary.length} characters`
                            : "Optional — auto-populated from resume"}
                    </p>
                </div>

                {/* ── Soft Skills ───────────────────────────────────────── */}
                <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5 backdrop-blur-sm">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <Heart className="w-3 h-3" />
                        Soft Skills
                        <span className="text-[9px] text-indigo-400 ml-1">✨ AI Extracted</span>
                    </label>

                    {/* Soft skill tags */}
                    {softSkills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            <AnimatePresence>
                                {softSkills.map((s) => (
                                    <motion.span
                                        key={s}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="flex items-center gap-1 px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 rounded-lg text-[11px] text-rose-300 font-medium"
                                    >
                                        <Heart className="w-3 h-3" />
                                        {s}
                                        <button
                                            onClick={() => removeSoftSkill(s)}
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
                                ref={softSkillInputRef}
                                type="text"
                                value={softSkillInput}
                                onChange={(e) => {
                                    setSoftSkillInput(e.target.value);
                                    setShowSoftSkillSuggestions(e.target.value.length > 0);
                                }}
                                onFocus={() => softSkillInput.length > 0 && setShowSoftSkillSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowSoftSkillSuggestions(false), 200)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        addSoftSkill();
                                    }
                                }}
                                placeholder="Type a soft skill (e.g. Communication, Leadership)…"
                                className="flex-1 bg-neutral-950/50 border border-neutral-800/50 rounded-xl px-4 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-indigo-500/40 transition-colors"
                            />
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => addSoftSkill()}
                                className="px-4 py-2 bg-rose-600/20 border border-rose-500/30 text-rose-400 rounded-xl hover:bg-rose-600/30 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                            </motion.button>
                        </div>

                        {/* Autocomplete dropdown */}
                        <AnimatePresence>
                            {showSoftSkillSuggestions && filteredSoftSkillSuggestions.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    className="absolute top-full left-0 right-12 mt-1 bg-neutral-900/95 border border-neutral-800/60 rounded-xl overflow-hidden z-20 shadow-2xl backdrop-blur-xl"
                                >
                                    {filteredSoftSkillSuggestions.map((s) => (
                                        <button
                                            key={s}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                addSoftSkill(s);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-neutral-300 hover:bg-rose-500/10 hover:text-rose-300 transition-colors flex items-center gap-2"
                                        >
                                            <Heart className="w-3 h-3 text-neutral-600" />
                                            {s}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <p className="text-[10px] text-neutral-600 mt-2">
                        {softSkills.length} soft skill{softSkills.length !== 1 ? "s" : ""} added
                        {softSkills.length === 0 && " — auto-populated from resume"}
                    </p>
                </div>

                {/* ── Years of Experience ───────────────────────────────── */}
                <div className="bg-neutral-900/40 border border-neutral-800/50 rounded-2xl p-5 backdrop-blur-sm">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <Briefcase className="w-3 h-3" />
                        Years of Experience
                        <span className="text-[9px] text-indigo-400 ml-1">✨ AI Extracted</span>
                    </label>
                    <input
                        type="number"
                        min="0"
                        max="70"
                        value={yearsOfExperience ?? ""}
                        onChange={(e) => setYearsOfExperience(e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="e.g. 5"
                        className="w-full bg-neutral-950/50 border border-neutral-800/50 rounded-xl px-4 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-indigo-500/40 transition-colors"
                    />
                    <p className="text-[10px] text-neutral-600 mt-2">
                        {yearsOfExperience !== null
                            ? `✓ ${yearsOfExperience} year${yearsOfExperience !== 1 ? "s" : ""}`
                            : "Optional — auto-populated from resume"}
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
                <div className="flex gap-3">
                    {onComplete && (
                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={onComplete}
                            disabled={submitting}
                            className="flex-1 py-3.5 bg-neutral-800/50 hover:bg-neutral-800 text-neutral-300 font-bold text-sm tracking-wider rounded-xl border border-neutral-700/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            Cancel
                        </motion.button>
                    )}
                    <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={handleSubmit}
                        disabled={submitting || skills.length === 0}
                        className={`${onComplete ? "flex-1" : "w-full"} py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm tracking-wider rounded-xl border border-indigo-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(99,102,241,0.15)]`}
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving Profile…
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-4 h-4" />
                                {onComplete ? "Done" : "Save Profile"}
                            </>
                        )}
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
}