"use client";

import { useEffect, useSyncExternalStore } from "react";
import * as R from "@/lib/quiz/review-state";
import { useQuizStore } from "@/lib/quiz/store";
import { syncState } from "@/lib/sync/state-sync";

const DEBOUNCE_MS = 4000;
let started = false;

async function syncQuiz() {
  const synced = await syncState(
    R.QUIZ_SYNC_KEY,
    R.toVersioned(useQuizStore.getState().data),
  );
  const latest = useQuizStore.getState();
  const adopted = R.adoptFromServer(latest.data, synced);
  if (adopted) latest.replace(adopted);
}

/** 확인 문제 기록을 기기에서 읽어 왔는지(읽기 전에는 복습할 문제를 모른다) */
export function useQuizHydrated(): boolean {
  const api = useQuizStore.persist;
  return useSyncExternalStore(
    (onChange) => {
      const unsub = api.onFinishHydration(onChange);
      if (!started) {
        started = true;
        void api.rehydrate();
      }
      return unsub;
    },
    () => api.hasHydrated(),
    () => false,
  );
}

/**
 * 확인 문제 기록을 서버와 맞춘다(화면을 열 때, 기록이 바뀌고 잠시 뒤, 화면을 떠날 때).
 * 방문자는 syncState가 맞추지 않아 자기 브라우저에만 남는다. 화면에 하나만 둔다.
 */
export function QuizSync() {
  const ready = useQuizHydrated();
  useEffect(() => {
    if (!ready) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    void syncQuiz();
    const unsub = useQuizStore.subscribe((s, p) => {
      if (s.data.updatedAt === p.data.updatedAt) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void syncQuiz(), DEBOUNCE_MS);
    });
    const onHide = () => {
      if (document.visibilityState === "hidden") void syncQuiz();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      unsub();
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [ready]);
  return null;
}
