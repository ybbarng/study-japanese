"use client";

import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";
import * as S from "./study-state";

// 노래마다 익힌 줄(브라우저에 남기고, 관리자는 서버 문서 songs-study와 맞춘다).

/** localStorage가 막힌 곳(사생활 보호 창 등)에서도 화면이 돌게 */
const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      // 저장 못 해도 이번 화면에서는 계속 쓴다
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      // 무시
    }
  },
};

interface SongsStudyStore {
  data: S.SongsStudy;
  toggle: (slug: string, ja: string, now?: number) => void;
  replace: (data: S.SongsStudy) => void;
}

export const useSongsStudyStore = create<SongsStudyStore>()(
  persist(
    (set, get) => ({
      data: S.emptySongsStudy(),
      toggle: (slug, ja, now = Date.now()) =>
        set({ data: S.toggleKnown(get().data, slug, ja, now) }),
      replace: (data) => set({ data }),
    }),
    {
      name: S.SONGS_STUDY_SYNC_KEY,
      version: 1,
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (s) => ({ data: s.data }),
      skipHydration: true,
    },
  ),
);
