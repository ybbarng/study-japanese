"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Progress } from "./download";
import type { OfflinePack } from "./pack";

// 받아 둔 강 목록(폰에 남김)과 지금 받는 일(메모리). 받는 일은 manager.ts가 돌린다.

export interface SavedPack {
  pack: OfflinePack;
  savedAt: number;
}

export interface Job {
  phase: "queued" | "running" | "error";
  progress: Progress;
  message?: string;
}

interface OfflineState {
  packs: Record<string, SavedPack>;
  /** 와이파이일 때 이어서 할 강 자동 받기 */
  autoNext: boolean;
  jobs: Record<string, Job>;
  /** 캐시 내용이 바뀔 때 올라간다(화면이 받아 둔 크기를 다시 센다) */
  version: number;

  savePack: (pack: OfflinePack, now: number) => void;
  forgetPack: (id: string) => void;
  setJob: (id: string, job: Job | null) => void;
  setAutoNext: (on: boolean) => void;
  bump: () => void;
}

export const useOffline = create<OfflineState>()(
  persist(
    (set) => ({
      packs: {},
      autoNext: false,
      jobs: {},
      version: 0,

      savePack: (pack, now) =>
        set((s) => ({
          packs: {
            ...s.packs,
            [pack.id]: { pack, savedAt: s.packs[pack.id]?.savedAt ?? now },
          },
        })),
      forgetPack: (id) =>
        set((s) => {
          const { [id]: _, ...packs } = s.packs;
          return { packs };
        }),
      setJob: (id, job) =>
        set((s) => {
          const { [id]: _, ...jobs } = s.jobs;
          return { jobs: job ? { ...jobs, [id]: job } : jobs };
        }),
      setAutoNext: (autoNext) => set({ autoNext }),
      bump: () => set((s) => ({ version: s.version + 1 })),
    }),
    {
      name: "sj-offline",
      partialize: (s) => ({ packs: s.packs, autoNext: s.autoNext }),
    },
  ),
);
