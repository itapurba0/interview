"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
    LiveKitRoom,
    RoomAudioRenderer,
    VoiceAssistantControlBar,
    BarVisualizer,
    useVoiceAssistant,
} from "@livekit/components-react";
import "@livekit/components-styles";

import { ProctoringWrapper } from "@/components/assessment/ProctoringWrapper";

const LiveKitScene = () => {
    const { assistantState, audioTrack } = useVoiceAssistant();

    return (
        <div className="flex flex-col items-center gap-6 w-full">
            <BarVisualizer
                state={assistantState}
                barCount={7}
                trackRef={audioTrack}
                className="h-48 w-full rounded-3xl bg-neutral-900/70"
            />
            <VoiceAssistantControlBar className="w-full" />
            <RoomAudioRenderer />
        </div>
    );
};

export default function VoiceInterviewRoom() {
    const { id } = useParams() ?? {};
    const applicationId = Array.isArray(id) ? id[0] : id;

    const [token, setToken] = useState("");
    const [statusLog, setStatusLog] = useState<string[]>([]);
    const [isFetching, setIsFetching] = useState(false);
    const [tokenError, setTokenError] = useState("");
    const hasRequestedTokenRef = useRef(false);
    const hasDispatchedAgentRef = useRef(false);
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "";

    const addStatus = useCallback((message: string) => {
        setStatusLog((previous) => {
            const next = [...previous, message];
            return next.slice(-6);
        });
    }, []);

    useEffect(() => {
        if (hasRequestedTokenRef.current) {
            return;
        }
        hasRequestedTokenRef.current = true;

        let isActive = true;
        setIsFetching(true);
        setTokenError("");
        addStatus("Requesting LiveKit interview token...");

        const fetchToken = async () => {
            const controller = new AbortController();
            const timeoutId = window.setTimeout(() => controller.abort(), 10000);

            try {
                if (!applicationId) {
                    throw new Error("Missing application identifier for LiveKit token.");
                }

                if (!livekitUrl) {
                    throw new Error("Missing NEXT_PUBLIC_LIVEKIT_URL.");
                }

                const response = await fetch(
                    `${apiBaseUrl}/api/v1/interview/token?application_id=${applicationId}`,
                    { signal: controller.signal }
                );

                if (!response.ok) {
                    const message = (await response.text()) || "Failed to acquire a token.";
                    throw new Error(message);
                }

                const payload = await response.json();
                if (!isActive) {
                    return;
                }

                if (!payload.token) {
                    throw new Error("Invalid token response from the server.");
                }

                setToken(payload.token);
                addStatus("Token acquired. Connecting to HireOps voice room...");
            } catch (error) {
                const message =
                    error instanceof DOMException && error.name === "AbortError"
                        ? "Interview service timed out. Please try again."
                        : error instanceof Error
                          ? error.message
                          : "Unable to fetch LiveKit token.";
                setTokenError(message);
                addStatus(`Token fetch failed: ${message}`);
            } finally {
                window.clearTimeout(timeoutId);
                if (isActive) {
                    setIsFetching(false);
                }
            }
        };

        fetchToken();
        return () => {
            isActive = false;
        };
    }, [applicationId, addStatus, apiBaseUrl, livekitUrl]);

    const handleEndInterview = useCallback(() => {
        // TODO: route to the post-interview destination after finalizing the flow.
    }, []);

    const handleForceSubmit = useCallback(() => {
        // TODO: route to the post-interview destination after finalizing the flow.
    }, []);

    const handleRoomConnected = useCallback(async () => {
        if (!applicationId || hasDispatchedAgentRef.current) {
            return;
        }

        hasDispatchedAgentRef.current = true;
        addStatus("LiveKit room connected. Dispatching recruiter agent...");

        try {
            const response = await fetch(`${apiBaseUrl}/api/v1/interview/dispatch?application_id=${applicationId}`, {
                method: "POST",
            });

            if (!response.ok) {
                const message = (await response.text()) || "Failed to dispatch recruiter agent.";
                throw new Error(message);
            }

            const payload = await response.json();
            addStatus(
                payload.dispatched
                    ? "Recruiter agent joined the room."
                    : "Recruiter agent was already active in the room."
            );
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to dispatch recruiter agent.";
            addStatus(`Agent dispatch failed: ${message}`);
        }
    }, [applicationId, addStatus, apiBaseUrl]);

    const canConnect = Boolean(token && livekitUrl);

    return (
        <ProctoringWrapper testName="AI Voice Interview" onForceSubmit={handleForceSubmit}>
            <div className="min-h-screen bg-neutral-950 text-white relative flex flex-col">
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-neutral-950 to-neutral-900 opacity-70 pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.2),_transparent_35%)] pointer-events-none" />

                <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 gap-8">
                    <div className="w-full max-w-5xl">
                        {canConnect ? (
                            <LiveKitRoom
                                serverUrl={livekitUrl}
                                token={token}
                                connect
                                audio
                                video={false}
                                onConnected={handleRoomConnected}
                            >
                                <div className="flex flex-col gap-6 p-6 rounded-3xl bg-black/60 border border-white/10 shadow-[0_25px_60px_rgba(15,118,255,0.35)]">
                                    <LiveKitScene />
                                    <p className="text-center text-sm text-neutral-400">
                                        LiveKit handles the voice stream, audio playback, and the AI recruiter controls for you.
                                    </p>
                                </div>
                            </LiveKitRoom>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-sky-500/60 bg-sky-500/5 p-8 min-h-[360px]">
                                <p className="text-lg font-semibold text-white">
                                    {tokenError ? "Token error" : "Preparing the voice room"}
                                </p>
                                <p className="text-sm text-neutral-400 text-center max-w-xl">
                                    {tokenError || (isFetching ? "Connecting the AI recruiter..." : "Waiting to initialize LiveKit...")}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="relative z-10 border-t border-neutral-800/60 bg-neutral-900/90 px-6 py-5 space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-[10px] font-semibold uppercase tracking-[0.5em] text-neutral-500">
                            Live Status
                        </h2>
                        <span className="text-[10px] text-neutral-500">{statusLog.length} updates</span>
                    </div>

                    <div className="rounded-2xl bg-black/20 border border-white/5 px-4 py-3 text-sm space-y-1 text-neutral-300 text-center">
                        {statusLog.length === 0 ? (
                            <p className="text-xs text-neutral-500 px-2">No updates yet. The AI agent will notify you when it&apos;s ready.</p>
                        ) : (
                            statusLog.map((line, index) => (
                                <p key={`${line}-${index}`} className="leading-tight">
                                    {line}
                                </p>
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
                            Ending the session closes the room and moves you to the post-interview page.
                        </p>
                    </div>
                </div>
            </div>
        </ProctoringWrapper>
    );
}
