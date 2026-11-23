"use client";

import { create } from "zustand";

// 사이트 재생기의 지금 재생 위치. GlobalPlayer만 쓰고, 자막·맥락 화면은 읽기만 한다.
// 재생 상태(store.ts)와 나눈 까닭: 위치는 1초에 네 번씩 바뀌어서, 같이 두면
// 대기열·설정을 읽는 화면까지 매번 다시 그려진다.

export interface PlaybackClock {
  /** 지금 소리 나는 트랙(따라 말하기 간격 중에는 null) */
  book: string | null;
  item: string | null;
  pos: number;
  duration: number;
}

export const usePlaybackClock = create<PlaybackClock>()(() => ({
  book: null,
  item: null,
  pos: 0,
  duration: Number.NaN,
}));

export function setPlaybackClock(next: Partial<PlaybackClock>) {
  usePlaybackClock.setState(next);
}

/** 이 트랙이 지금 재생기에 올라 있을 때의 위치, 아니면 null */
export function usePositionOf(book: string, item: string): number | null {
  return usePlaybackClock((s) =>
    s.book === book && s.item === item ? s.pos : null,
  );
}
