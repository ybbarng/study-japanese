"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePlaybackClock } from "@/lib/player/clock";
import { usePlayer } from "@/lib/player/store";
import { type ClockSample, estimatePosition } from "@/lib/songs/tap-sync";
import { SONG_BOOK } from "@/lib/songs/track";

/**
 * 누른 순간의 재생 위치. 재생기는 위치를 1초에 네 번쯤만 알리므로,
 * 마지막 알림과 그때부터 흐른 시간으로 메운다(재생기 내부는 건드리지 않는다).
 */
export function useTapClock(slug: string): () => number | null {
  const sample = useRef<ClockSample | null>(null);

  useEffect(
    () =>
      usePlaybackClock.subscribe((s) => {
        if (s.book !== SONG_BOOK || s.item !== slug) {
          sample.current = null;
          return;
        }
        // 길이만 바뀐 알림은 위치를 새로 받은 때로 치지 않는다
        if (sample.current?.pos === s.pos) return;
        sample.current = { pos: s.pos, at: performance.now() };
      }),
    [slug],
  );

  return useCallback(() => {
    if (!sample.current) return null;
    const st = usePlayer.getState();
    return estimatePosition(
      sample.current,
      performance.now(),
      st.rate,
      st.wantPlaying,
    );
  }, []);
}
