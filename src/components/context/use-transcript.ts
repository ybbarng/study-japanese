"use client";

import { useEffect, useState } from "react";
import { type Transcript, transcriptSchema } from "@/lib/context/cues";

// 트랙의 자막(맥락 카드 포함)을 받아 온다. 한 번 받은 것(없음 포함)은 화면이 바뀌어도 다시 받지 않는다.
const cache = new Map<string, Transcript | null>();
const inflight = new Map<string, Promise<Transcript | null>>();

/** 자막 받기. 오프라인 등으로 못 받으면 null이지만 없음으로 적지 않아 다음에 다시 시도한다 */
export function fetchTranscript(
  book: string,
  item: string,
): Promise<Transcript | null> {
  const key = `${book}/${item}`;
  if (cache.has(key)) return Promise.resolve(cache.get(key) ?? null);
  const running = inflight.get(key);
  if (running) return running;
  const p = fetch(`/api/transcripts/${key}`)
    .then(async (res) => {
      const parsed = res.ok
        ? transcriptSchema.safeParse(await res.json())
        : null;
      const value = parsed?.success ? parsed.data : null;
      cache.set(key, value);
      return value;
    })
    .catch(() => null)
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

export function useTranscript(
  book: string | undefined,
  item: string | undefined,
): Transcript | null {
  const key = book && item ? `${book}/${item}` : null;
  const [transcript, setTranscript] = useState<Transcript | null>(
    key ? (cache.get(key) ?? null) : null,
  );

  useEffect(() => {
    if (!book || !item) {
      setTranscript(null);
      return;
    }
    let cancelled = false;
    void fetchTranscript(book, item).then((t) => {
      if (!cancelled) setTranscript(t);
    });
    return () => {
      cancelled = true;
    };
  }, [book, item]);

  return transcript;
}
