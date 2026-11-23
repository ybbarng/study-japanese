"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RepeatMode, Track } from "./queue";

// 사이트 전체에 재생기는 하나다(GlobalPlayer). 화면은 이 상태만 바꾸고, <audio>는 GlobalPlayer가 쥔다.

interface PlayerState {
  queue: Track[];
  index: number;
  /** 사용자가 원하는 상태(재생/멈춤). 실제 <audio> 상태는 GlobalPlayer가 맞춘다 */
  wantPlaying: boolean;
  /** 트랙을 바꾸거나 처음부터 다시 틀 때 올라간다 */
  loadToken: number;
  rate: number;
  repeat: RepeatMode;
  shadowGap: boolean;
  expanded: boolean;

  playQueue: (tracks: Track[], start?: number) => void;
  jump: (index: number) => void;
  restart: () => void;
  setPlaying: (playing: boolean) => void;
  setRate: (rate: number) => void;
  setRepeat: (repeat: RepeatMode) => void;
  setShadowGap: (on: boolean) => void;
  setExpanded: (on: boolean) => void;
  stop: () => void;
}

export const usePlayer = create<PlayerState>()(
  persist(
    (set) => ({
      queue: [],
      index: 0,
      wantPlaying: false,
      loadToken: 0,
      rate: 1,
      repeat: "off",
      shadowGap: false,
      expanded: false,

      playQueue: (tracks, start = 0) =>
        set((s) => ({
          queue: tracks,
          index: start,
          wantPlaying: true,
          loadToken: s.loadToken + 1,
        })),
      jump: (index) =>
        set((s) => ({ index, wantPlaying: true, loadToken: s.loadToken + 1 })),
      restart: () =>
        set((s) => ({ wantPlaying: true, loadToken: s.loadToken + 1 })),
      setPlaying: (wantPlaying) => set({ wantPlaying }),
      setRate: (rate) => set({ rate }),
      setRepeat: (repeat) => set({ repeat }),
      setShadowGap: (shadowGap) => set({ shadowGap }),
      setExpanded: (expanded) => set({ expanded }),
      stop: () =>
        set({ queue: [], index: 0, wantPlaying: false, expanded: false }),
    }),
    {
      name: "sj-player",
      // 다시 열었을 때 대기열과 설정은 남기되 저절로 재생하지는 않는다
      partialize: (s) => ({
        queue: s.queue,
        index: s.index,
        rate: s.rate,
        repeat: s.repeat,
        shadowGap: s.shadowGap,
      }),
    },
  ),
);

export function currentTrack(
  s: Pick<PlayerState, "queue" | "index">,
): Track | undefined {
  return s.queue[s.index];
}
