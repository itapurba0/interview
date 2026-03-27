import { useState, useEffect, useRef, useCallback } from "react";

interface ProctoringConfig {
  assessmentId: string;
  candidateId: string;
  enabled?: boolean; // only start camera when true
}

interface ProctoringState {
  warningCount: number;
  isCameraActive: boolean;
  cameraBlocked: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
}

export function useProctoring({ assessmentId, candidateId, enabled = true }: ProctoringConfig): ProctoringState {
  const [warningCount, setWarningCount] = useState(0);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraBlocked, setCameraBlocked] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // ─── 1. Tab Visibility Tracking ─────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setWarningCount((prev) => prev + 1);
        console.warn('[Proctoring] Tab switch / minimize detected.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enabled]);

  // ─── 2. Snapshot capture & send to CV backend ───────────────────
  const captureAndSendSnapshot = useCallback(async () => {
    if (!videoRef.current || videoRef.current.readyState < 2) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const base64Image = canvas.toDataURL('image/jpeg', 0.5);

      try {
        const res = await fetch('/api/v1/proctoring/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assessmentId,
            candidateId,
            image: base64Image,
          }),
        });
        const data = await res.json();
        if (data.anomalyDetected) {
          setWarningCount((prev) => prev + 1);
        }
      } catch (err) {
        console.error('[Proctoring] Snapshot stream failed:', err);
      }
    }
  }, [assessmentId, candidateId]);

  // ─── 3. WebRTC Camera Initialization (only when enabled) ────────
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const initializeCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: 'user' },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        setStream(stream);

        // Attach the stream to the ref'd <video> element if available
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }

        setIsCameraActive(true);
        setCameraBlocked(false);

        // Start periodic snapshots (every 5s)
        intervalRef.current = setInterval(captureAndSendSnapshot, 5000);
      } catch (err) {
        console.error('[Proctoring] Camera access denied:', err);
        setIsCameraActive(false);
        setCameraBlocked(true);
        setWarningCount((prev) => prev + 1);
      }
    };

    initializeCamera();

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [enabled, captureAndSendSnapshot]);

  return { warningCount, isCameraActive, cameraBlocked, videoRef, stream };
}
