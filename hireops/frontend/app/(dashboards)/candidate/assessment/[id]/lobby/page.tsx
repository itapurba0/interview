"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Camera, 
  Mic, 
  Wifi, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  ShieldAlert,
  ChevronRight,
  ShieldCheck
} from "lucide-react";

export default function PreTestLobby() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const type = searchParams.get("type") || "mcq";

  const videoRef = useRef<HTMLVideoElement>(null);

  const [cameraOk, setCameraOk] = useState(false);
  const [micOk, setMicOk] = useState(false);
  const [internetOk, setInternetOk] = useState(false);
  
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // 1. Media Permission Hook
  useEffect(() => {
    let stream: MediaStream | null = null;

    const requestMedia = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true, // we request audio to verify mic, but keep video tag muted
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // If we get here, both were naturally granted
        const videoTracks = stream.getVideoTracks();
        const audioTracks = stream.getAudioTracks();

        if (videoTracks.length > 0) setCameraOk(true);
        if (audioTracks.length > 0) setMicOk(true);
        setPermissionError(null);

      } catch (err: any) {
        console.error("Media permission error:", err);
        setCameraOk(false);
        setMicOk(false);
        setPermissionError(
          "Camera or Microphone access was denied. Please update your browser settings and refresh."
        );
      }
    };

    requestMedia();

    // Cleanup tracks on unmount
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // 2. Internet Connectivity Hook
  useEffect(() => {
    // Initial check
    if (typeof navigator !== "undefined") {
      setInternetOk(navigator.onLine);
    }

    const handleOnline = () => setInternetOk(true);
    const handleOffline = () => setInternetOk(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const allClear = cameraOk && micOk && internetOk;

  const handleStart = () => {
    if (allClear) {
      router.push(`/candidate/assessment/${id}/take?type=${type}`);
    }
  };

  const ChecklistItem = ({ 
    icon: Icon, 
    label, 
    isOk 
  }: { 
    icon: any; 
    label: string; 
    isOk: boolean 
  }) => (
    <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${isOk ? "bg-emerald-500/10 text-emerald-400" : "bg-neutral-800 text-neutral-500"}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm font-medium text-neutral-200">{label}</span>
      </div>
      <div>
        {isOk ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        ) : (
          <XCircle className="w-5 h-5 text-neutral-700 animate-pulse" />
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col flex-1 items-center justify-center p-6 md:p-12 min-h-[calc(100vh-4rem)]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-5 gap-8 bg-neutral-950/50 p-8 rounded-[2.5rem] border border-neutral-800/80 shadow-[0_0_100px_rgba(0,0,0,0.5)] backdrop-blur-xl relative overflow-hidden"
      >
        {/* Subtle background glow based on status */}
        <div className={`absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] -z-10 transition-colors duration-1000 ${allClear ? "bg-emerald-500/10" : "bg-indigo-500/10"}`} />

        {/* Left Column: Video Preview & Rules */}
        <div className="lg:col-span-3 space-y-6 flex flex-col h-full">
          <div>
            <h1 className="text-3xl font-light tracking-tight text-white mb-2">
              Proctoring Setup
            </h1>
            <p className="text-neutral-400 text-sm">
              Please verify your system settings to ensure a secure testing environment.
            </p>
          </div>

          {/* Video Preview Container */}
          <div className="relative aspect-video rounded-3xl overflow-hidden bg-neutral-900 border border-neutral-800 shadow-inner flex items-center justify-center">
            {/* Fallback pattern */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at center, #ffffff 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
            
            <video 
              ref={videoRef}
              autoPlay 
              playsInline 
              muted 
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${cameraOk ? "opacity-100" : "opacity-0"}`}
              style={{ transform: "rotateY(180deg)" }} // Mirror effect for natural feel
            />

            {!cameraOk && (
              <div className="z-10 flex flex-col items-center text-neutral-500">
                <Camera className="w-12 h-12 mb-4 opacity-50 animate-pulse" />
                <p className="text-sm font-medium tracking-wide w-3/4 text-center">
                  {permissionError || "Waiting for camera permissions..."}
                </p>
              </div>
            )}

            {/* Live Indicator Overlay */}
            {cameraOk && (
              <div className="absolute top-4 left-4 px-3 py-1 bg-black/50 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] uppercase font-bold tracking-widest text-white/90">Live Preview</span>
              </div>
            )}
          </div>

          {/* Proctoring Rules */}
          <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-5 space-y-3 mt-auto">
            <div className="flex items-center gap-2 text-amber-400/90 font-semibold text-sm uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4" />
              Strict Proctoring Rules
            </div>
            <ul className="space-y-2 text-sm text-amber-100/60">
              <li className="flex items-start gap-2">
                <span className="text-amber-500">•</span>
                Do not switch tabs or minimize the browser window.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500">•</span>
                Ensure you are alone in a quiet, well-lit room.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-500">•</span>
                Maintain eye contact with the screen at all times.
              </li>
            </ul>
          </div>
        </div>

        {/* Right Column: Checklist & Action */}
        <div className="lg:col-span-2 flex flex-col justify-center space-y-8 lg:pl-4">
          
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-neutral-500 uppercase tracking-widest pl-1">
              System Check
            </h3>
            <div className="space-y-3">
              <ChecklistItem icon={Camera} label="Camera Access" isOk={cameraOk} />
              <ChecklistItem icon={Mic} label="Microphone Access" isOk={micOk} />
              <ChecklistItem icon={Wifi} label="Stable Internet" isOk={internetOk} />
            </div>
          </div>

          <div className="pt-6 border-t border-neutral-800/50">
            <motion.button
              whileHover={allClear ? { scale: 1.02, y: -2 } : {}}
              whileTap={allClear ? { scale: 0.98 } : {}}
              onClick={handleStart}
              disabled={!allClear}
              className={`w-full relative overflow-hidden group flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-sm tracking-wide transition-all duration-300 ${
                allClear 
                  ? "bg-white text-black shadow-xl shadow-white/10" 
                  : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
              }`}
            >
              {allClear ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5 opacity-50" />}
              {allClear ? "Start Assessment" : "Awaiting Approvals"}
              {allClear && <ChevronRight className="w-4 h-4" />}

              {/* Shine effect on clear */}
              {allClear && (
                <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              )}
            </motion.button>
            
            {!allClear && (
              <p className="text-center text-xs text-neutral-500 mt-4 leading-relaxed px-4">
                You must resolve all system checks before you can enter the secure environment.
              </p>
            )}
            
            {allClear && (
              <p className="text-center text-xs text-emerald-500/70 mt-4 font-medium flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Ready to begin
              </p>
            )}
          </div>
        </div>

      </motion.div>
    </div>
  );
}
