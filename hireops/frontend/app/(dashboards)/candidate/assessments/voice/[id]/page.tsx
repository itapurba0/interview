"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    LiveKitRoom,
    RoomAudioRenderer,
    VoiceAssistantControlBar,
    BarVisualizer,
    useVoiceAssistant,
    useLocalParticipant,
    useRoomContext,
    useConnectionState,
} from "@livekit/components-react";
import { ConnectionState, DisconnectReason } from "livekit-client";
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

const ActiveRoomControls = ({
    applicationId,
    apiBaseUrl,
    statusLog,
    onEvaluationComplete,
    connectionState,
}: {
    applicationId: string;
    apiBaseUrl: string;
    statusLog: string[];
    onEvaluationComplete: () => void;
    connectionState: ConnectionState;
}) => {
    const room = useRoomContext();
    const { localParticipant } = useLocalParticipant();
    const isConnected = connectionState === ConnectionState.Connected;
    const [isEvaluating, setIsEvaluating] = useState(false);

    const isMuted = !localParticipant?.isMicrophoneEnabled;

    const toggleMute = useCallback(() => {
        if (!isConnected || !localParticipant) {
            return;
        }
        localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled);
    }, [isConnected, localParticipant]);

    const handleEndInterview = useCallback(async () => {
        setIsEvaluating(true);
        try {
            const safeId = applicationId?.trim();
            if (!safeId) {
                console.warn("Cannot evaluate interview: missing application ID.");
            } else {
                await fetch(`${apiBaseUrl}/api/v1/interview/${safeId}/evaluate`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ transcript: "Transcript captured by the AI worker on disconnect." }),
                });
            }
        } catch (error) {
            console.error("Failed to trigger evaluation:", error);
        } finally {
            room?.disconnect();
            onEvaluationComplete();
        }
    }, [apiBaseUrl, applicationId, onEvaluationComplete, room]);

    return (
        <div className="relative z-10 border-t border-neutral-800/60 bg-neutral-900/90 px-6 py-5 space-y-3 w-full">
            <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.5em] text-neutral-500">
                    Live Status
                </h2>
                <span className="text-[10px] text-neutral-500">{statusLog.length} updates</span>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <button
                        type="button"
                        onClick={toggleMute}
                        className={`px-6 py-3 rounded-2xl font-semibold text-sm transition ${isMuted
                            ? 'bg-amber-500/20 text-amber-500 border border-amber-500/50'
                            : 'bg-neutral-800 text-white hover:bg-neutral-700'
                            }`}
                        disabled={!isConnected || isEvaluating}
                    >
                        {isMuted ? "Unmute Mic" : "Mute Mic"}
                    </button>

                    <button
                        type="button"
                        onClick={handleEndInterview}
                        disabled={!isConnected || isEvaluating}
                        className="w-full md:w-auto px-6 py-3 rounded-2xl bg-red-500 text-white font-semibold text-sm tracking-widest transition hover:bg-red-400 shadow-[0_10px_40px_rgba(239,68,68,0.4)] disabled:opacity-50"
                    >
                        {isEvaluating ? "Saving & Evaluating..." : "End Interview"}
                    </button>
                </div>
                <p className="text-xs text-neutral-500 max-w-xl text-right">
                    {isEvaluating
                        ? "Compiling transcript and generating HR scorecard..."
                        : "Ending the session closes the room and moves you to the post-interview page."}
                </p>
            </div>
        </div>
    );
};

const StatusLogPanel = ({ statusLog }: { statusLog: string[] }) => (
    <div className="rounded-2xl bg-black/20 border border-white/5 px-4 py-3 text-sm space-y-1 text-neutral-300 text-center max-h-32 overflow-y-auto">
        {statusLog.length === 0 ? (
            <p className="text-xs text-neutral-500 px-2">Waiting for updates from the recruiter agent...</p>
        ) : (
            statusLog.map((line, index) => (
                <p key={`${line}-${index}`} className="leading-tight">
                    {line}
                </p>
            ))
        )}
    </div>
);

const ConnectionStatusBanner = ({
    message,
    connectionState,
}: {
    message: string;
    connectionState: ConnectionState;
}) => {
    const statusTone = connectionState === ConnectionState.Connected ? "text-emerald-300" : "text-sky-400";
    return (
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/60 px-5 py-3 text-[11px] uppercase tracking-[0.4em] text-neutral-400">
            <span className={`flex-1 text-sm ${statusTone}`}>{connectionState === ConnectionState.Connected ? "LiveKit connected" : message}</span>
        </div>
    );
};

const LiveKitExperienceContent = ({
    applicationId,
    apiBaseUrl,
    statusLog,
    onEvaluationComplete,
    statusMessage,
}: {
    applicationId: string;
    apiBaseUrl: string;
    statusLog: string[];
    onEvaluationComplete: () => void;
    statusMessage: string;
}) => {
    const connectionState = useConnectionState();

    return (
        <div className="flex flex-col gap-6 p-6 rounded-3xl bg-black/60 border border-white/10 shadow-[0_25px_60px_rgba(15,118,255,0.35)]">
            <ConnectionStatusBanner message={statusMessage} connectionState={connectionState} />
            <LiveKitScene />
            <p className="text-center text-sm text-neutral-400">
                LiveKit handles the voice stream, audio playback, and the AI recruiter controls for you.
            </p>
            <StatusLogPanel statusLog={statusLog} />
            <ActiveRoomControls
                applicationId={applicationId}
                apiBaseUrl={apiBaseUrl}
                statusLog={statusLog}
                onEvaluationComplete={onEvaluationComplete}
                connectionState={connectionState}
            />
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
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "wss://hireops-3y5x2bk8.livekit.cloud";

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

                const response = await fetch(
                    `${apiBaseUrl}/api/v1/interview/token?application_id=${applicationId}`,
                    { signal: controller.signal }
                );

                if (!response.ok) {
                    const message = (await response.text()) || "Failed to acquire a token.";
                    throw new Error(message);
                }
                console.log("LiveKit token response received:", response);
                const payload = await response.json();
                console.log("isActive:", isActive)
                if (!isActive) {
                    console.log("Component unmounted before token could be set. Discarding token.");
                    return;
                }
                console.log("LiveKit token payload:", payload);
                if (!payload.token) {
                    throw new Error("Invalid token response from the server.");
                }
                console.log("LiveKit token acquired successfully.");
                setToken(payload.token);
                hasRequestedTokenRef.current = true;
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

    const router = useRouter();
    const goToCongratulations = useCallback(() => {
        router.push("/candidate/congratulations");
    }, [router]);

    const handleLiveKitError = useCallback(
        (error: Error) => {
            addStatus(`LiveKit error: ${error.message}`);
            setTokenError(error.message);
        },
        [addStatus, setTokenError],
    );

    const handleLiveKitDisconnected = useCallback(
        (reason?: DisconnectReason) => {
            addStatus(`LiveKit disconnected (${reason ?? "unknown"})`);
        },
        [addStatus],
    );

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

    const livekitServerUrl = livekitUrl || undefined;
    const livekitToken = token || undefined;
    const livekitShouldConnect = Boolean(livekitServerUrl && livekitToken);
    const livekitStatusMessage = useMemo(() => {
        if (tokenError) {
            return tokenError;
        }
        if (!token) {
            return isFetching ? "Requesting LiveKit interview token..." : "Preparing interview data...";
        }
        return "LiveKit token acquired. Connecting to the room...";
    }, [token, tokenError, isFetching]);

    return (
        <ProctoringWrapper testName="AI Voice Interview" onForceSubmit={goToCongratulations}>
            <div className="min-h-screen bg-neutral-950 text-white relative flex flex-col">
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-neutral-950 to-neutral-900 opacity-70 pointer-events-none" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.2),_transparent_35%)] pointer-events-none" />

                <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 gap-8">
                    <div className="w-full max-w-5xl">
                        <LiveKitRoom
                            serverUrl={livekitServerUrl}
                            token={livekitToken}
                            connect={livekitShouldConnect}
                            audio
                            video={false}
                            onConnected={handleRoomConnected}
                            onError={handleLiveKitError}
                            onDisconnected={handleLiveKitDisconnected}
                        >
                            <LiveKitExperienceContent
                                applicationId={applicationId ?? ""}
                                apiBaseUrl={apiBaseUrl}
                                statusLog={statusLog}
                                onEvaluationComplete={goToCongratulations}
                                statusMessage={livekitStatusMessage}
                            />
                        </LiveKitRoom>
                    </div>
                </div>
            </div>
        </ProctoringWrapper>
    );
}
