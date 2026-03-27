"use client";

import { useEffect, useRef, useState, useCallback, use } from "react";
import { useInterviewStore } from "@/store/useInterviewStore";
import { useProctoring } from "@/hooks/useProctoring";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  PhoneOff,
  Radio,
  Wifi,
  WifiOff,
  Loader2,
  Camera,
  CameraOff,
  MessageSquare,
  ShieldCheck,
  Video,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Audio Visualizer Ring — Arranged radially around the orb (smaller radius)
// ---------------------------------------------------------------------------
function OrbVisualizer({
  active,
  mode,
}: {
  active: boolean;
  mode: "ai" | "candidate" | "idle";
}) {
  const barCount = 40;
  const radius = 95; // smaller ring

  const colorMap = {
    ai: "bg-indigo-400",
    candidate: "bg-emerald-400",
    idle: "bg-neutral-700",
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {Array.from({ length: barCount }).map((_, i) => {
        const angle = (i / barCount) * 360;
        const rad = (angle * Math.PI) / 180;
        const x = Math.cos(rad) * radius;
        const y = Math.sin(rad) * radius;
        const maxH = 6 + Math.random() * 20;

        return (
          <motion.div
            key={i}
            className={`absolute w-[2px] rounded-full origin-bottom ${colorMap[mode]}`}
            style={{
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              transform: `rotate(${angle + 90}deg)`,
            }}
            animate={{
              height: active ? [2, maxH, 2] : [2, 3, 2],
              opacity: active ? [0.3, 0.9, 0.3] : 0.12,
            }}
            transition={{
              duration: 0.35 + Math.random() * 0.45,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 0.4,
            }}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pre-Session Permission Gate
// ---------------------------------------------------------------------------
function PermissionGate({
  interviewId,
  onGranted,
}: {
  interviewId: string;
  onGranted: () => void;
}) {
  const [micStatus, setMicStatus] = useState<"pending" | "granted" | "denied">("pending");
  const [camStatus, setCamStatus] = useState<"pending" | "granted" | "denied">("pending");
  const [checking, setChecking] = useState(false);

  const requestPermissions = async () => {
    setChecking(true);

    // Request microphone
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStream.getTracks().forEach((t) => t.stop());
      setMicStatus("granted");
    } catch {
      setMicStatus("denied");
    }

    // Request camera
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
      camStream.getTracks().forEach((t) => t.stop());
      setCamStatus("granted");
    } catch {
      setCamStatus("denied");
    }

    setChecking(false);
  };

  const allGranted = micStatus === "granted" && camStatus === "granted";

  return (
    <div className="h-screen flex items-center justify-center bg-neutral-950 p-8">
      {/* Ambient */}
      <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600/[0.04] rounded-full blur-[200px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-lg w-full text-center space-y-8 p-10 bg-neutral-900/40 border border-neutral-800/50 rounded-3xl backdrop-blur-xl"
      >
        <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
          <ShieldCheck className="w-8 h-8 text-indigo-400" />
        </div>

        <div>
          <h2 className="text-xl font-semibold text-neutral-100 mb-2">
            Pre-Interview Setup
          </h2>
          <p className="text-sm text-neutral-500 leading-relaxed">
            This interview is proctored. We need access to your microphone and camera
            to proceed.
          </p>
          <p className="text-xs text-neutral-600 mt-2">
            Session #{interviewId}
          </p>
        </div>

        {/* Permission statuses */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-5 py-3 bg-neutral-950/60 border border-neutral-800/40 rounded-xl">
            <div className="flex items-center gap-3">
              <Mic className="w-4 h-4 text-neutral-400" />
              <span className="text-sm text-neutral-300">Microphone</span>
            </div>
            <StatusBadge status={micStatus} />
          </div>
          <div className="flex items-center justify-between px-5 py-3 bg-neutral-950/60 border border-neutral-800/40 rounded-xl">
            <div className="flex items-center gap-3">
              <Video className="w-4 h-4 text-neutral-400" />
              <span className="text-sm text-neutral-300">Camera</span>
            </div>
            <StatusBadge status={camStatus} />
          </div>
        </div>

        {/* Actions */}
        {!allGranted ? (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={requestPermissions}
            disabled={checking}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm tracking-wider border border-indigo-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {checking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Requesting Access…
              </>
            ) : micStatus === "denied" || camStatus === "denied" ? (
              "Retry Permissions"
            ) : (
              "Grant Permissions"
            )}
          </motion.button>
        ) : (
          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onGranted}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm tracking-wider border border-emerald-500/30 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
          >
            <Radio className="w-4 h-4" />
            Start Interview
          </motion.button>
        )}

        {(micStatus === "denied" || camStatus === "denied") && (
          <p className="text-xs text-red-400/80">
            Permission denied. Please allow access in your browser settings and retry.
          </p>
        )}
      </motion.div>
    </div>
  );
}

function StatusBadge({ status }: { status: "pending" | "granted" | "denied" }) {
  if (status === "pending") {
    return (
      <span className="text-[10px] font-bold text-neutral-600 tracking-wider px-2 py-0.5 bg-neutral-800/50 rounded-full border border-neutral-700/30">
        WAITING
      </span>
    );
  }
  if (status === "granted") {
    return (
      <span className="text-[10px] font-bold text-emerald-400 tracking-wider px-2 py-0.5 bg-emerald-950/50 rounded-full border border-emerald-700/30">
        ✓ GRANTED
      </span>
    );
  }
  return (
    <span className="text-[10px] font-bold text-red-400 tracking-wider px-2 py-0.5 bg-red-950/50 rounded-full border border-red-700/30">
      ✕ DENIED
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function VoiceInterviewRoom({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: interviewId } = use(params);

  // Permission gate state
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  const {
    isConnecting,
    isAiSpeaking,
    isCandidateSpeaking,
    transcript,
    socketError,
    interviewStatus,
    setIsConnecting,
    setAiSpeaking,
    setCandidateSpeaking,
    addTranscriptMessage,
    setSocketError,
    setInterviewStatus,
    reset,
  } = useInterviewStore();

  // Proctoring — only start when permissions granted
  const { isCameraActive, videoRef } = useProctoring({
    assessmentId: interviewId,
    candidateId: "cand_123",
    enabled: permissionsGranted,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // ── Timer ─────────────────────────────────────────────────────
  useEffect(() => {
    if (interviewStatus !== "active") return;
    const tick = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(tick);
  }, [interviewStatus]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  // ── Auto-scroll chat ──────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // ── Base64 helper ─────────────────────────────────────────────
  const arrayBufferToBase64 = useCallback((buffer: ArrayBuffer) => {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }, []);

  // ── Play AI audio ─────────────────────────────────────────────
  const playIncomingAudio = useCallback(async (base64Audio: string) => {
    if (!audioContextRef.current) return;
    const binaryString = window.atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);

    try {
      const audioBuffer = await audioContextRef.current.decodeAudioData(
        bytes.buffer.slice(0)
      );
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();
      return new Promise((resolve) => { source.onended = resolve; });
    } catch {
      return new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }, []);

  // ── WebSocket + Mic — only after permissions ──────────────────
  useEffect(() => {
    if (!permissionsGranted) return;

    reset();
    const wsUrl = `ws://localhost:8000/ws/interview/${interviewId}`;
    setIsConnecting(true);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    audioContextRef.current = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();

    ws.onopen = () => {
      setIsConnecting(false);
      setInterviewStatus("active");
      initMicrophone();
    };

    ws.onmessage = async (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "transcript") {
          addTranscriptMessage(payload.sender, payload.text);
        } else if (payload.type === "audio") {
          setAiSpeaking(true);
          await playIncomingAudio(payload.data);
          setAiSpeaking(false);
        }
      } catch { /* malformed */ }
    };

    ws.onerror = () => setSocketError("Connection lost. Is the backend running?");
    ws.onclose = () => {
      if (interviewStatus !== "completed") setInterviewStatus("completed");
    };

    return () => {
      ws.close();
      if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
      mediaRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewId, permissionsGranted]);

  const initMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = async (e) => {
        if (
          e.data.size > 0 &&
          wsRef.current?.readyState === WebSocket.OPEN &&
          !isMuted
        ) {
          setCandidateSpeaking(true);
          const buffer = await e.data.arrayBuffer();
          const b64 = arrayBufferToBase64(buffer);
          wsRef.current.send(JSON.stringify({ type: "audio", data: b64 }));
          setTimeout(() => setCandidateSpeaking(false), 600);
        }
      };
      recorder.start(1000);
    } catch {
      setSocketError("Microphone access denied.");
    }
  };

  // ── Controls ──────────────────────────────────────────────────
  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      mediaRecorderRef.current?.stream
        ?.getAudioTracks()
        .forEach((t) => { t.enabled = !next; });
      return next;
    });
  };

  const endInterview = () => {
    wsRef.current?.close();
    setInterviewStatus("completed");
    mediaRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
  };

  const getStatusLabel = () => {
    if (isConnecting) return "Establishing Uplink…";
    if (interviewStatus === "completed") return "Interview Complete";
    if (isAiSpeaking) return "AI Agent Speaking…";
    if (isCandidateSpeaking) return "Listening to You…";
    return "Neural Core Active — Listening";
  };

  const getMode = (): "ai" | "candidate" | "idle" => {
    if (isAiSpeaking) return "ai";
    if (isCandidateSpeaking) return "candidate";
    return "idle";
  };



  // ── GATE: Show permission screen first ────────────────────────
  if (!permissionsGranted) {
    return (
      <PermissionGate
        interviewId={interviewId}
        onGranted={() => setPermissionsGranted(true)}
      />
    );
  }

  // ── Completed Screen ──────────────────────────────────────────
  if (interviewStatus === "completed" && !isConnecting) {
    return (
      <div className="h-screen flex items-center justify-center bg-neutral-950 p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center space-y-6 p-10 bg-emerald-950/20 border border-emerald-700/30 rounded-3xl backdrop-blur-xl"
        >
          <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center border border-emerald-500/30">
            <Radio className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-semibold text-neutral-100">
            Interview Complete
          </h2>
          <p className="text-sm text-neutral-400 leading-relaxed">
            Session lasted {formatTime(elapsed)}. Transcript submitted for AI evaluation.
          </p>
          <div className="text-xs text-neutral-600">
            {transcript.length} messages exchanged
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Main Interview UI ─────────────────────────────────────────
  return (
    <div className="relative h-screen flex flex-col bg-neutral-950 overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600/[0.04] rounded-full blur-[200px] pointer-events-none" />
      <div className="absolute bottom-[15%] left-[15%] w-[300px] h-[300px] bg-emerald-600/[0.03] rounded-full blur-[180px] pointer-events-none" />

      {/* Error banner */}
      <AnimatePresence>
        {socketError && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-red-950/80 border border-red-500/40 text-red-300 px-6 py-2.5 rounded-xl backdrop-blur-xl shadow-2xl text-xs font-bold tracking-wider"
          >
            <WifiOff className="w-4 h-4" />
            {socketError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top Bar ───────────────────────────────────────────────── */}
      <div className="relative z-10 flex items-center justify-between px-6 py-2.5 border-b border-neutral-800/30 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="bg-neutral-900/60 p-1.5 rounded-lg border border-neutral-800/50">
            <Radio className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xs font-semibold text-neutral-200 tracking-tight">
              AI Voice Interview
            </h1>
            <p className="text-[9px] text-neutral-600 uppercase tracking-widest font-bold">
              Session #{interviewId} • Proctored
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 bg-neutral-900/60 border border-neutral-800/50 rounded-full text-[10px] font-mono font-bold text-neutral-400">
            {formatTime(elapsed)}
          </div>
          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold tracking-wider ${
              isConnecting
                ? "bg-amber-950/40 border-amber-700/30 text-amber-400"
                : "bg-emerald-950/40 border-emerald-700/30 text-emerald-400"
            }`}
          >
            {isConnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wifi className="w-3 h-3" />}
            {isConnecting ? "…" : "LIVE"}
          </div>
          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold tracking-wider ${
              isCameraActive
                ? "bg-emerald-950/40 border-emerald-700/30 text-emerald-400"
                : "bg-red-950/40 border-red-700/30 text-red-400"
            }`}
          >
            {isCameraActive ? <Camera className="w-3 h-3" /> : <CameraOff className="w-3 h-3" />}
            CAM
          </div>
        </div>
      </div>

      {/* ── Center — Orb + Status + Controls + Chat ───────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0 px-4 relative z-10 gap-3">
        {/* AI Orb (smaller: 220px) */}
        <div className="relative w-[220px] h-[220px] shrink-0">
          <OrbVisualizer
            active={isAiSpeaking || isCandidateSpeaking}
            mode={getMode()}
          />
          <motion.div
            animate={{
              scale: isAiSpeaking ? [1, 1.05, 1] : isCandidateSpeaking ? [1, 1.03, 1] : 1,
              boxShadow: isAiSpeaking
                ? "0 0 80px rgba(99,102,241,0.4)"
                : isCandidateSpeaking
                ? "0 0 60px rgba(16,185,129,0.25)"
                : "0 0 20px rgba(99,102,241,0.05)",
            }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className="absolute inset-6 rounded-full border border-neutral-800/60 bg-neutral-900/50 backdrop-blur-xl flex items-center justify-center"
          >
            <motion.div
              animate={{
                backgroundColor: isAiSpeaking
                  ? "rgba(129, 140, 248, 0.45)"
                  : isCandidateSpeaking
                  ? "rgba(52, 211, 153, 0.3)"
                  : "rgba(129, 140, 248, 0.05)",
              }}
              transition={{ duration: 0.4 }}
              className="w-16 h-16 rounded-full blur-2xl absolute"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
                {isAiSpeaking ? (
                  <Radio className="w-6 h-6 text-indigo-400" />
                ) : isCandidateSpeaking ? (
                  <Mic className="w-6 h-6 text-emerald-400" />
                ) : (
                  <Radio className="w-6 h-6 text-neutral-600" />
                )}
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Status */}
        <motion.p
          key={getStatusLabel()}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm font-light tracking-wide text-neutral-300"
        >
          {getStatusLabel()}
        </motion.p>

        {/* Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleMute}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wider border transition-all ${
              isMuted
                ? "bg-red-950/50 border-red-700/40 text-red-300 hover:bg-red-950/70"
                : "bg-neutral-900/60 border-neutral-800/50 text-neutral-300 hover:bg-neutral-800/60"
            }`}
          >
            {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            {isMuted ? "UNMUTE" : "MUTE"}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={endInterview}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wider bg-red-600/80 hover:bg-red-500/80 text-white border border-red-500/30 transition-all shadow-[0_0_15px_rgba(239,68,68,0.15)]"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            END
          </motion.button>
        </div>

        {/* ── Compact Chat Panel (scrollable, shows ~2-3 msgs) ────── */}
        <div className="w-full max-w-lg shrink-0 mt-1">
          <div className="bg-neutral-900/30 border border-neutral-800/40 rounded-2xl backdrop-blur-md overflow-hidden">
            <div className="flex items-center justify-between px-4 py-1.5 border-b border-neutral-800/30">
              <div className="flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3 text-neutral-600" />
                <span className="text-[9px] font-bold text-neutral-600 uppercase tracking-widest">
                  Transcript
                </span>
              </div>
              <span className="text-[9px] text-neutral-700 font-mono">
                {transcript.length}
              </span>
            </div>

            <div className="overflow-y-auto p-3 space-y-2" style={{ maxHeight: "140px" }}>
              <AnimatePresence mode="popLayout">
                {transcript.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`flex gap-2 ${msg.sender === "candidate" ? "flex-row-reverse" : ""}`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[8px] font-bold mt-0.5 ${
                        msg.sender === "candidate"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                          : "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20"
                      }`}
                    >
                      {msg.sender === "candidate" ? "Y" : "A"}
                    </div>
                    <div
                      className={`px-3 py-1.5 rounded-xl text-[11px] leading-relaxed max-w-[85%] ${
                        msg.sender === "candidate"
                          ? "bg-emerald-500/8 border border-emerald-500/15 text-emerald-100 rounded-tr-sm"
                          : "bg-indigo-500/8 border border-indigo-500/15 text-indigo-100 rounded-tl-sm"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {transcript.length === 0 && !isConnecting && (
                <div className="py-3 text-center text-neutral-700 tracking-widest text-[10px] uppercase font-bold animate-pulse">
                  Awaiting communication…
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Webcam PiP — Bottom Right ─────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="fixed bottom-4 right-4 w-40 rounded-2xl border border-neutral-800/60 bg-neutral-900/80 backdrop-blur-xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)] z-30"
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full aspect-[4/3] object-cover bg-black"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
        <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 bg-black/60 border border-neutral-700/50 rounded-full backdrop-blur-sm">
          {isCameraActive ? <Camera className="w-2.5 h-2.5 text-emerald-400" /> : <CameraOff className="w-2.5 h-2.5 text-red-400" />}
          <span className="text-[7px] font-bold text-neutral-300 tracking-wider">
            PROCTORED
          </span>
        </div>
      </motion.div>
    </div>
  );
}
