"use client";

import { useEffect, useSyncExternalStore } from "react";
import * as S from "@/lib/songs/study-state";
import { useSongsStudyStore } from "@/lib/songs/study-store";
import { syncState } from "@/lib/sync/state-sync";

const DEBOUNCE_MS = 4000;
const api = useSongsStudyStore.persist;
let started = false;

async function syncOnce() {
  const synced = await syncState(
    S.SONGS_STUDY_SYNC_KEY,
    S.toVersioned(useSongsStudyStore.getState().data),
  );
  const latest = useSongsStudyStore.getState();
  const adopted = S.adoptFromServer(latest.data, synced);
  if (adopted) latest.replace(adopted);
}

/**
 * 익힌 줄 기록: 기기에 저장된 것을 읽어 왔는지 돌려주고, 읽은 뒤로 서버와 맞춘다
 * (화면을 열 때, 바꾸고 잠시 뒤, 화면을 떠날 때. 방문자는 syncState가 건너뛴다).
 */
export function useSongsStudyReady(): boolean {
  const ready = useSyncExternalStore(
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

  useEffect(() => {
    if (!ready) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    void syncOnce();
    const unsub = useSongsStudyStore.subscribe((s, p) => {
      if (s.data.updatedAt === p.data.updatedAt) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void syncOnce(), DEBOUNCE_MS);
    });
    const onHide = () => {
      if (document.visibilityState === "hidden") void syncOnce();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      unsub();
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [ready]);

  return ready;
}
