"use client";

import { useCallback, useEffect, useState } from "react";
import { indexListens, type ListenIndex } from "@/lib/ilmuta/progress";
import type { Track } from "@/lib/player/queue";
import { currentTrack, usePlayer } from "@/lib/player/store";

// 일무따 화면과 사이트 재생기(usePlayer)를 잇는 훅들.

/** 지금 재생기에 올라 있는 항목과 재생 중인지 */
export function useNowPlaying(): { item: string | null; playing: boolean } {
  const item = usePlayer((s) => {
    const t = currentTrack(s);
    return t?.book === "ilmuta" ? t.item : null;
  });
  const playing = usePlayer((s) => s.wantPlaying);
  return { item, playing };
}

/**
 * 대기열을 튼다. 같은 항목이 이미 올라 있으면 처음부터 다시 틀지 않고 이어서 재생하거나 멈춘다.
 * (단어 카드를 여러 번 눌러도 소리가 매번 처음으로 돌아가지 않게)
 */
export function usePlay() {
  return useCallback((tracks: Track[], start = 0, toggle = true) => {
    const st = usePlayer.getState();
    const cur = currentTrack(st);
    const target = tracks[start];
    if (!target) return;
    if (cur && cur.book === target.book && cur.item === target.item) {
      if (!st.wantPlaying) st.setPlaying(true);
      else if (toggle) st.setPlaying(false);
      return;
    }
    st.playQueue(tracks, start);
  }, []);
}

/** 재생기 막대가 화면 아래에 떠 있는지(아래 단추를 그 위로 올린다) */
export function usePlayerBarVisible(): boolean {
  return usePlayer((s) => s.queue.length > 0);
}

/**
 * 들은 횟수. 서버 렌더 값으로 시작해, 트랙이 바뀌거나 멈출 때(재생기가 기록을 보낸 뒤)와
 * 화면으로 돌아올 때 `/api/listen` 요약을 다시 받는다.
 */
export function useListenIndex(initial: ListenIndex): ListenIndex {
  const [index, setIndex] = useState(initial);
  const loadToken = usePlayer((s) => s.loadToken);
  const playing = usePlayer((s) => s.wantPlaying);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 트랙이 바뀌거나 재생·멈춤이 바뀔 때 다시 받으려고 일부러 둔다
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const res = await fetch("/api/listen?book=ilmuta");
        if (!res.ok) return;
        const { items } = await res.json();
        if (!cancelled) setIndex(indexListens(items));
      } catch {
        // 오프라인이면 있던 값을 둔다
      }
    };
    // 재생기가 기록을 대기열에 넣고 보내는 데 걸리는 시간만큼 기다린다
    const timer = setTimeout(refresh, 1500);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadToken, playing]);

  return index;
}

// 재생 위치는 src/lib/player/clock.ts(usePositionOf)에서 읽는다.
