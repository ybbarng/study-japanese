"use client";

import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";
import * as R from "./review-state";

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

interface QuizStore {
  data: R.QuizData;
  answer: (key: string, correct: boolean, now?: number) => void;
  replace: (data: R.QuizData) => void;
}

/** 확인 문제 간격 반복 기록. 이 기기에 두고, 관리자면 서버(`ilmuta-quiz`)와 맞춘다 */
export const useQuizStore = create<QuizStore>()(
  persist(
    (set, get) => ({
      data: R.emptyQuizData(),
      answer: (key, correct, now = Date.now()) =>
        set({ data: R.recordQuizAnswer(get().data, key, correct, now) }),
      replace: (data) => set({ data }),
    }),
    {
      name: R.QUIZ_SYNC_KEY,
      version: 1,
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (s) => ({ data: s.data }),
      skipHydration: true,
    },
  ),
);
