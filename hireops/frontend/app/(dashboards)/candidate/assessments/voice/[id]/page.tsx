"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
    LiveKitRoom,
    RoomAudioRenderer,
    VoiceAssistantControlBar,
    BarVisualizer,
    useVoiceAssistant,
    TrackToggle,
    DisconnectButton,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";
import { useRouter } from "next/navigation";

import { ProctoringWrapper } from "@/components/assessment/ProctoringWrapper";

const LiveKitScene = () => {
    const { state, audioTrack } = useVoiceAssistant();

    return (
        <div className="flex flex-col items-center gap-6 w-full">
            <BarVisualizer
                state={state}
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
    const router = useRouter();
    const { id } = useParams() ?? {};

    const [token, setToken] = useState("");
    const [statusLog, setStatusLog] = useState<string[]>([]);
    const [isFetching, setIsFetching] = useState(false);
    const [tokenError, setTokenError] = useState("");
    const hasRequestedTokenRef = useRef(false);
    const hasDispatchedAgentRef = useRef(false);

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
            try {
                if (!id) {
                    throw new Error("Missing application identifier for LiveKit token.");
                }
                const response = await fetch(`/api/v1/interview/token?application_id=${id}`);
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
                const message = error instanceof Error ? error.message : "Unable to fetch LiveKit token.";
                setTokenError(message);
                addStatus(`Token fetch failed: ${message}`);
            } finally {
                if (isActive) {
                    setIsFetching(false);
                }
            }
        };

        fetchToken();
        return () => {
            isActive = false;
        };
    }, [id, addStatus]);

    const handleEndInterview = useCallback(() => {
        // TODO: route to the post-interview destination after finalizing the flow.
    }, []);

    const handleForceSubmit = useCallback(() => {
        // TODO: route to the post-interview destination after finalizing the flow.
    }, []);

    const handleRoomConnected = useCallback(async () => {
        if (!id || hasDispatchedAgentRef.current) {
            return;
        }

        hasDispatchedAgentRef.current = true;
        addStatus("LiveKit room connected. Dispatching recruiter agent...");

        try {
            const response = await fetch(`/api/v1/interview/dispatch?application_id=${id}`, {
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
    }, [id, addStatus]);

    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "";
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
                                onDisconnected={() => router.push("/candidate/congratulations")}
                            >
                                <div className="flex flex-col gap-6 p-6 rounded-3xl bg-black/60 border border-white/10 shadow-[0_25px_60px_rgba(15,118,255,0.35)]">
                                    <LiveKitScene />
                                    <div className="flex justify-center gap-4">
                                        <TrackToggle
                                            source={Track.Source.Microphone}
                                            className="px-6 py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 transition-all border border-white/10"
                                        />
                                    </div>
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
                        {canConnect ? (
                            <LiveKitRoom
                                serverUrl={livekitUrl}
                                token={token}
                            >
                                <DisconnectButton
                                    className="w-full md:w-auto px-6 py-3 rounded-2xl bg-red-500 text-white font-semibold text-sm tracking-widest transition hover:bg-red-400 shadow-[0_10px_40px_rgba(239,68,68,0.4)]"
                                >
                                    End Interview
                                </DisconnectButton>
                            </LiveKitRoom>
                        ) : (
                            <button
                                type="button"
                                onClick={handleEndInterview}
                                className="w-full md:w-auto px-6 py-3 rounded-2xl bg-red-500 text-white font-semibold text-sm tracking-widest transition hover:bg-red-400 shadow-[0_10px_40px_rgba(239,68,68,0.4)]"
                            >
                                End Interview
                            </button>
                        )}
                        <p className="text-xs text-neutral-500 max-w-xl">
                            Ending the session closes the room and moves you to the post-interview page.
                        </p>
                    </div>
                </div>
            </div>
        </ProctoringWrapper>
    );
}
