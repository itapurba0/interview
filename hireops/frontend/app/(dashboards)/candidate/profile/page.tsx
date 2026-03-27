"use client";

import CandidateProfileForm from "@/components/forms/CandidateProfileForm";

export default function ProfilePage() {
  return (
    <div className="relative min-h-screen bg-neutral-950 py-12 px-4 overflow-auto">
      {/* Ambient */}
      <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-600/[0.03] rounded-full blur-[200px] pointer-events-none" />

      <div className="relative z-10">
        <CandidateProfileForm />
      </div>
    </div>
  );
}
