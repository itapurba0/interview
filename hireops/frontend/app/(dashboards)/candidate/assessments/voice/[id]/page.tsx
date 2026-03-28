"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ProctoringWrapper } from "@/components/assessment/ProctoringWrapper";

type TranscriptMessage = {
    id: string;
    sender: "ai" | "system";
    text: string;
};

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export default function VoiceInterviewRoom({ params }: { params: { id: string } }) {
    const { id } = params;
    const router = useRouter();

    const [isConnected, setIsConnected] = useState(false);
    const [isAiSpeaking, setIsAiSpeaking] = useState(false);
    const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);

    const wsRef = useRef<WebSocket | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const transcriptRef = useRef<HTMLDivElement | null>(null);
    const aiSpeakingTimerRef = useRef<number | null>(null);

    const pushTranscript = useCallback((sender: TranscriptMessage["sender"], text: string) => {
        setTranscript((previous) => {
            const next = [...previous, { id: createId(), sender, text }];
            return next.slice(-32);
        });
    }, []);

    const pulseAi = useCallback(() => {
        setIsAiSpeaking(true);
        if (aiSpeakingTimerRef.current) {
            window.clearTimeout(aiSpeakingTimerRef.current);
        }
        aiSpeakingTimerRef.current = window.setTimeout(() => {
            setIsAiSpeaking(false);
            aiSpeakingTimerRef.current = null;
        }, 2200);
    }, []);

    const handleIncomingMessage = useCallback(
        (event: MessageEvent) => {
            if (typeof event.data !== "string") {
                return;
            }

            try {
                const payload = JSON.parse(event.data);
                const text = payload.text ?? payload.message ?? "";

                if (payload.event === "ai_speaking") {
                    if (typeof text === "string" && text.length) {
                        pushTranscript("ai", text);
                    }
                    pulseAi();
                } else if (payload.event === "ai_context") {
                    if (typeof text === "string" && text.length) {
                        pushTranscript("system", text);
                    }
                } else if (payload.event === "error") {
                    if (typeof text === "string" && text.length) {
                        pushTranscript("system", text);
                    }
                } else if (typeof text === "string" && text.length) {
                    pushTranscript("system", text);
                }
            } catch {
                pushTranscript("system", "Received malformed realtime payload.");
            }
        },
        [pushTranscript, pulseAi]
    );

    const stopRecording = useCallback(() => {
        if (!mediaRecorderRef.current) {
            return;
        }

        if (mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
        mediaRecorderRef.current.stream?.getTracks().forEach((track) => track.stop());
        mediaRecorderRef.current = null;
    }, []);

    const cleanUp = useCallback(
        (shouldNavigate = false) => {
            if (aiSpeakingTimerRef.current) {
                window.clearTimeout(aiSpeakingTimerRef.current);
                aiSpeakingTimerRef.current = null;
            }

            stopRecording();

            if (wsRef.current) {
                wsRef.current.onmessage = null;
                wsRef.current.onopen = null;
                wsRef.current.onerror = null;
                wsRef.current.onclose = null;
                wsRef.current.close();
                wsRef.current = null;
            }

            setIsConnected(false);
            setIsAiSpeaking(false);

            if (shouldNavigate) {
                router.push("/dashboards/candidate/congratulations");
            }
        },
        [router, stopRecording]
    );

    const startInterview = useCallback(async () => {
        if (wsRef.current) {
            return;
        }

        if (typeof MediaRecorder === "undefined") {
            pushTranscript("system", "Your browser does not support MediaRecorder.");
            return;
        }

        pushTranscript("system", "Requesting microphone access and connecting to AI...");

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = async (event) => {
                if (!event.data.size || wsRef.current?.readyState !== WebSocket.OPEN) {
                    return;
                }
                const buffer = await event.data.arrayBuffer();
                wsRef.current?.send(buffer);
            };

            const socket = new WebSocket(`ws://localhost:8000/api/v1/interview/stream/${id}`);
            socket.binaryType = "arraybuffer";
            wsRef.current = socket;

            socket.onopen = () => {
                setIsConnected(true);
                pushTranscript("system", "Connected. The AI is waiting for your voice.");
                recorder.start(250);
            };

            socket.onmessage = handleIncomingMessage;
            socket.onerror = () => {
                pushTranscript("system", "Realtime connection failed. Please check your network.");
            };

            socket.onclose = () => {
                setIsConnected(false);
                stopRecording();
                wsRef.current = null;
            };
        } catch {
            pushTranscript("system", "Microphone access denied. Please allow access to continue.");
            cleanUp(false);
        }
    }, [id, cleanUp, handleIncomingMessage, pushTranscript, stopRecording]);

    useEffect(() => {
        startInterview();
        return () => cleanUp(false);
    }, [startInterview, cleanUp]);

    useEffect(() => {
        const container = transcriptRef.current;
        if (!container) {
            return;
        }
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }, [transcript]);

    const handleEndInterview = useCallback(() => {
        cleanUp(true);
    }, [cleanUp]);

    const handleForceSubmit = useCallback(
        (_warningCount: number) => {
            cleanUp(true);
        },
        [cleanUp]
    );

    return (
        <ProctoringWrapper testName="AI Voice Interview" onForceSubmit={handleForceSubmit}>
            <div className="min-h-screen bg-neutral-950 text-white relative flex flex-col">
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-neutral-950 to-neutral-900 opacity-70 pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.2),_transparent_35%)] pointer-events-none" />

                <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 gap-8">
                    <div className="absolute top-6 right-6 flex items-center gap-2 text-[10px] uppercase tracking-[0.4em] text-neutral-400">
                        <span
                            className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-400" : "bg-red-500"}`}
                        />
                        {isConnected ? "Connected" : "Connecting..."}
                    </div>

                    <div className="relative">
                        <div
                            className={`absolute inset-0 rounded-full blur-[70px] transition-colors duration-500 ${isAiSpeaking ? "bg-gradient-to-br from-teal-500/40 via-purple-500/30 to-transparent" : "bg-gradient-to-br from-sky-500/30 via-blue-500/20 to-transparent"
                                }`}
                        />
                        <div
                            className={`relative w-64 h-64 rounded-full border-4 ${isAiSpeaking ? "border-teal-300 bg-gradient-to-br from-teal-500/30 via-purple-500/40 to-transparent" : "border-sky-400/70 bg-gradient-to-br from-sky-500/20 to-transparent"
                                } animate-pulse shadow-[0_0_40px_rgba(14,165,233,0.5)]`}
                        >
                            <div className="absolute inset-4 rounded-full border-2 border-white/10 flex flex-col items-center justify-center text-center gap-1">
                                <p className="text-[10px] uppercase tracking-[0.6em] text-neutral-400">
                                    Voice AI
                                </p>
                                <p className="text-3xl font-semibold text-white">
                                    {isAiSpeaking ? "Speaking" : "Listening"}
                                </p>
                                <p className="text-xs text-neutral-500">
                                    {isConnected ? "Live stream active" : "Establishing link"}
                                </p>
                            </div>
                        </div>
                    </div>

                    <p className="text-sm text-neutral-400 max-w-xl text-center">
                        {isAiSpeaking
                            ? "The AI interviewer is responding. Keep calm and listen to the prompt."
                            : "The circle glows blue while the AI waits—speak when it is calm to keep the audio clean."
                        }
                    </p>
                </div>

                <div className="relative z-10 border-t border-neutral-800/60 bg-neutral-900/90 px-6 py-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-[10px] font-semibold uppercase tracking-[0.5em] text-neutral-500">
                            Live Transcript
                        </h2>
                        <span className="text-[10px] text-neutral-500">{transcript.length} lines</span>
                    </div>

                    <div
                        ref={transcriptRef}
                        className="relative max-h-40 overflow-y-auto rounded-2xl bg-black/20 border border-white/5 px-4 py-3 text-sm space-y-2 custom-scrollbar"
                    >
                        {transcript.length === 0 ? (
                            <p className="text-xs text-neutral-500">Waiting for the AI interviewer to speak...</p>
                        ) : (
                            transcript.map((message) => (
                                <div key={message.id} className="flex gap-3">
                                    <span
                                        className={`text-[10px] font-semibold tracking-[0.4em] uppercase ${message.sender === "ai" ? "text-emerald-300" : "text-indigo-300"
                                            }`}
                                    >
                                        {message.sender === "ai" ? "AI" : "System"}
                                    </span>
                                    <p className="text-neutral-100 leading-tight">{message.text}</p>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <button
                            type="button"
                            onClick={handleEndInterview}
                            className="w-full md:w-auto px-6 py-3 rounded-2xl bg-red-500 text-white font-semibold text-sm tracking-widest transition hover:bg-red-400 shadow-[0_10px_40px_rgba(239,68,68,0.4)]"
                        >
                            End Interview
                        </button>
                        <p className="text-xs text-neutral-500 max-w-xl">
                            Ending the interview closes your microphone stream and moves you to the Congratulations page.
                        </p>
                    </div>
                </div>
            </div>
        </ProctoringWrapper>
    );
}