"use client";

import { useEffect, useState } from "react";
import { type Transcript, transcriptSchema } from "@/lib/context/cues";

// 지금 트랙의 자막을 받아 온다. 한 번 받은 것(없음 포함)은 화면이 바뀌어도 다시 받지 않는다.
const cache = new Map<string, Transcript | null>();

export function useTranscript(
  book: string | undefined,
  item: string | undefined,
): Transcript | null {
  const key = book && item ? `${book}/${item}` : null;
  const [transcript, setTranscript] = useState<Transcript | null>(
    key ? (cache.get(key) ?? null) : null,
  );

  useEffect(() => {
    if (!key) {
      setTranscript(null);
      return;
    }
    if (cache.has(key)) {
      setTranscript(cache.get(key) ?? null);
      return;
    }
    let cancelled = false;
    fetch(`/api/transcripts/${key}`)
      .then(async (res) => {
        const parsed = res.ok
          ? transcriptSchema.safeParse(await res.json())
          : null;
        const value = parsed?.success ? parsed.data : null;
        cache.set(key, value);
        if (!cancelled) setTranscript(value);
      })
      .catch(() => {
        // 오프라인이면 다음에 다시 시도한다(없음으로 적지 않는다)
        if (!cancelled) setTranscript(null);
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return transcript;
}
