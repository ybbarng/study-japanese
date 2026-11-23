"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  classifyMicError,
  type MicError,
  pickMimeType,
} from "@/lib/ilmuta/recording";

export type RecorderState =
  | { kind: "idle" }
  | { kind: "recording"; startedAt: number }
  | { kind: "error"; error: MicError };

export interface Recording {
  blob: Blob;
  durationSec: number;
}

/** 마이크로 녹음. stop()이 녹음 Blob을 돌려준다 */
export function useRecorder() {
  const [state, setState] = useState<RecorderState>({ kind: "idle" });
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);

  const release = useCallback(() => {
    for (const t of stream.current?.getTracks() ?? []) t.stop();
    stream.current = null;
    recorder.current = null;
  }, []);

  useEffect(() => release, [release]);

  const start = useCallback(async () => {
    if (
      typeof MediaRecorder === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setState({ kind: "error", error: "unsupported" });
      return false;
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      const mimeType = pickMimeType((t) => MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(
        stream.current,
        mimeType ? { mimeType } : undefined,
      );
      chunks.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      rec.start();
      recorder.current = rec;
      startedAt.current = Date.now();
      setState({ kind: "recording", startedAt: startedAt.current });
      return true;
    } catch (err) {
      release();
      setState({ kind: "error", error: classifyMicError(err) });
      return false;
    }
  }, [release]);

  const stop = useCallback((): Promise<Recording | null> => {
    const rec = recorder.current;
    if (!rec || rec.state === "inactive") return Promise.resolve(null);
    return new Promise((resolve) => {
      rec.onstop = () => {
        const blob = new Blob(chunks.current, {
          type: rec.mimeType || "audio/webm",
        });
        const durationSec = (Date.now() - startedAt.current) / 1000;
        release();
        setState({ kind: "idle" });
        resolve(blob.size > 0 ? { blob, durationSec } : null);
      };
      rec.stop();
    });
  }, [release]);

  return { state, start, stop };
}
