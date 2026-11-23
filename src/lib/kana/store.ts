"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";
import type { CardId } from "./data";
import * as S from "./state";

interface KanaActions {
  introduce: (ids: readonly CardId[], now?: number) => void;
  answer: (id: CardId, correct: boolean, now?: number) => void;
  completeLesson: (lessonId: string, now?: number) => void;
  /** 새 최고 기록이면 true */
  recordBest: (
    gameId: string,
    score: number,
    higherIsBetter?: boolean,
    now?: number,
  ) => boolean;
  replace: (data: S.KanaData) => void;
  reset: () => void;
}

export type KanaStore = S.KanaData & KanaActions;

/** localStorage가 막힌 환경(사생활 보호 창 등)에서도 화면이 돌게 try/catch로 감싼다. */
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

const pickData = (s: KanaStore): S.KanaData => ({
  version: s.version,
  updatedAt: s.updatedAt,
  cards: s.cards,
  lessons: s.lessons,
  bests: s.bests,
  days: s.days,
});

export const useKanaStore = create<KanaStore>()(
  persist(
    (set, get) => ({
      ...S.emptyKanaData(),
      introduce: (ids, now = Date.now()) =>
        set(S.introduce(pickData(get()), ids, now)),
      answer: (id, correct, now = Date.now()) =>
        set(S.answer(pickData(get()), id, correct, now)),
      completeLesson: (lessonId, now = Date.now()) =>
        set(S.completeLesson(pickData(get()), lessonId, now)),
      recordBest: (gameId, score, higherIsBetter = true, now = Date.now()) => {
        const r = S.recordBest(
          pickData(get()),
          gameId,
          score,
          now,
          higherIsBetter,
        );
        set(r.data);
        return r.isNew;
      },
      replace: (data) => set(data),
      reset: () => set(S.emptyKanaData(Date.now())),
    }),
    {
      name: "kana-state",
      version: 1,
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: pickData,
      skipHydration: true,
    },
  ),
);

/** 상태 전체를 JSON 한 줄로(서버 동기화·백업용) */
export function exportKanaState(): string {
  return S.serializeKanaData(pickData(useKanaStore.getState()));
}

/** JSON을 읽어 상태를 통째로 바꾼다. 모양이 틀리면 오류를 던지고 아무것도 바꾸지 않는다. */
export function importKanaState(json: string): void {
  useKanaStore.getState().replace(S.parseKanaData(json));
}

let hydrationStarted = false;

/** localStorage에서 읽어 오기가 끝났는지. 끝나기 전에는 빈 상태로 그리지 않게 쓴다. */
export function useKanaHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const unsub = useKanaStore.persist.onFinishHydration(onChange);
      if (!hydrationStarted) {
        hydrationStarted = true;
        void useKanaStore.persist.rehydrate();
      }
      return unsub;
    },
    () => useKanaStore.persist.hasHydrated(),
    () => false,
  );
}
