"use client";

import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";
import * as D from "./drill-state";
import * as T from "./test-state";

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

/** 이 기기에서만 쓰는 드릴 설정(서버로 보내지 않는다) */
export interface DrillPrefs {
  /** 어디까지 연 과 */
  maxLesson: number;
  answerMode: "type" | "choose";
}

interface DrillStore {
  data: D.DrillData;
  prefs: DrillPrefs;
  answer: (skillKey: string, correct: boolean, now?: number) => void;
  recordBest: (
    kind: keyof D.DrillData["bests"],
    score: number,
    now?: number,
  ) => boolean;
  replace: (data: D.DrillData) => void;
  setPrefs: (prefs: Partial<DrillPrefs>) => void;
}

export const useDrillStore = create<DrillStore>()(
  persist(
    (set, get) => ({
      data: D.emptyDrillData(),
      prefs: { maxLesson: 25, answerMode: "type" },
      answer: (key, correct, now = Date.now()) =>
        set({ data: D.recordAnswer(get().data, key, correct, now) }),
      recordBest: (kind, score, now = Date.now()) => {
        const r = D.recordBest(get().data, kind, score, now);
        if (r.isNew) set({ data: r.data });
        return r.isNew;
      },
      replace: (data) => set({ data }),
      setPrefs: (prefs) => set({ prefs: { ...get().prefs, ...prefs } }),
    }),
    {
      name: "ilmunta-drill",
      version: 1,
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (s) => ({ data: s.data, prefs: s.prefs }),
      skipHydration: true,
    },
  ),
);

interface TestsStore {
  data: T.TestsData;
  add: (result: T.TestResult) => void;
  replace: (data: T.TestsData) => void;
}

export const useTestsStore = create<TestsStore>()(
  persist(
    (set, get) => ({
      data: T.emptyTestsData(),
      add: (result) => set({ data: T.addResult(get().data, result) }),
      replace: (data) => set({ data }),
    }),
    {
      name: "ilmunta-tests",
      version: 1,
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (s) => ({ data: s.data }),
      skipHydration: true,
    },
  ),
);
