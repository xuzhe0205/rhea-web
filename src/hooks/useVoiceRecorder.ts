"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderState = "idle" | "recording" | "transcribing";

const MAX_DURATION_MS = 60_000; // 1 minute hard cap

export function useVoiceRecorder(onBlob: (blob: Blob) => Promise<void>) {
  const [recorderState, setRecorderState] = useState<RecorderState>("idle");
  const [elapsed, setElapsed] = useState(0); // seconds

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobEvent["data"][]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);

  const clearTimers = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (autoStopRef.current) { clearTimeout(autoStopRef.current); autoStopRef.current = null; }
  }, []);

  const stopRecording = useCallback(async () => {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === "inactive") return;

    clearTimers();

    return new Promise<void>((resolve) => {
      mr.onstop = async () => {
        const mimeType = mr.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];
        mediaRecorderRef.current = null;

        setRecorderState("transcribing");
        setElapsed(0);
        try {
          await onBlob(blob);
        } finally {
          setRecorderState("idle");
        }
        resolve();
      };
      mr.stop();
      mr.stream.getTracks().forEach((t) => t.stop());
    });
  }, [clearTimers, onBlob]);

  const startRecording = useCallback(async () => {
    if (recorderState !== "idle") return;

    // WeChat's built-in browser (X5/TBS) blocks getUserMedia entirely.
    // Prompt the user to open in their system browser instead.
    const isWeChatBrowser = /MicroMessenger/i.test(navigator.userAgent);
    if (isWeChatBrowser) {
      alert("Voice input is not supported in WeChat's browser.\nPlease open this page in Chrome or your phone's browser.\n\n请在手机浏览器中打开此页面以使用语音功能。");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      // Permission denied or no mic available — fail silently
      return;
    }

    chunksRef.current = [];

    // Prefer webm/opus; browsers fall back gracefully
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "";

    const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    mediaRecorderRef.current = mr;

    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mr.start(250); // collect chunks every 250ms
    startTimeRef.current = Date.now();
    setRecorderState("recording");
    setElapsed(0);

    // Tick every second
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    // Auto-stop at 1 minute
    autoStopRef.current = setTimeout(() => {
      void stopRecording();
    }, MAX_DURATION_MS);
  }, [recorderState, stopRecording]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearTimers();
      mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, [clearTimers]);

  return { recorderState, elapsed, startRecording, stopRecording };
}
