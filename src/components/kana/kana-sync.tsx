"use client";

import { useEffect, useRef } from "react";
import { useKanaStore } from "@/lib/kana/store";
import { adoptFromServer, KANA_SYNC_KEY, toVersioned } from "@/lib/kana/sync";
import { syncState } from "@/lib/sync/state-sync";

const DEBOUNCE_MS = 4000;

async function syncOnce() {
  const s = useKanaStore.getState();
  const synced = await syncState(KANA_SYNC_KEY, toVersioned(s));
  const latest = useKanaStore.getState();
  const adopted = adoptFromServer(latest, synced);
  if (adopted) latest.replace(adopted);
}

/**
 * 가나 진도를 서버와 맞춘다: 화면을 열 때, 기록이 바뀌고 잠시 뒤, 화면을 떠날 때.
 * 오프라인이면 조용히 넘어가고 다음 기회에 맞춘다.
 */
export function KanaSync() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void syncOnce();
    const unsub = useKanaStore.subscribe((st, prev) => {
      if (st.updatedAt === prev.updatedAt) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void syncOnce(), DEBOUNCE_MS);
    });
    const onHide = () => {
      if (document.visibilityState === "hidden") void syncOnce();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      unsub();
      if (timer.current) clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, []);

  return null;
}
