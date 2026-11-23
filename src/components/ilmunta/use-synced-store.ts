"use client";

import { useEffect, useSyncExternalStore } from "react";
import * as D from "@/lib/ilmunta/drill-state";
import { useDrillStore, useTestsStore } from "@/lib/ilmunta/stores";
import * as T from "@/lib/ilmunta/test-state";
import { syncState } from "@/lib/sync/state-sync";

const DEBOUNCE_MS = 4000;

type PersistApi = {
  hasHydrated: () => boolean;
  rehydrate: () => Promise<void> | void;
  onFinishHydration: (fn: () => void) => () => void;
};

const started = new WeakSet<PersistApi>();

/** 기기에 저장된 기록을 읽어 왔는지(읽기 전에는 빈 상태로 그리지 않게) */
function useHydratedPersist(api: PersistApi): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const unsub = api.onFinishHydration(onChange);
      if (!started.has(api)) {
        started.add(api);
        void api.rehydrate();
      }
      return unsub;
    },
    () => api.hasHydrated(),
    () => false,
  );
}

/**
 * 상태 문서 하나를 서버와 맞춘다: 화면을 열 때, 기록이 바뀌고 잠시 뒤, 화면을 떠날 때.
 * 오프라인이면 조용히 넘어가고 다음 기회에 맞춘다.
 */
function useServerSync(
  ready: boolean,
  syncOnce: () => Promise<void>,
  subscribe: (onChange: () => void) => () => void,
) {
  useEffect(() => {
    if (!ready) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    void syncOnce();
    const unsub = subscribe(() => {
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
  }, [ready, syncOnce, subscribe]);
}

async function syncDrill() {
  const synced = await syncState(
    D.DRILL_SYNC_KEY,
    D.toVersioned(useDrillStore.getState().data),
  );
  const latest = useDrillStore.getState();
  const adopted = D.adoptFromServer(latest.data, synced);
  if (adopted) latest.replace(adopted);
}
const subscribeDrill = (onChange: () => void) =>
  useDrillStore.subscribe((s, p) => {
    if (s.data.updatedAt !== p.data.updatedAt) onChange();
  });

async function syncTests() {
  const synced = await syncState(
    T.TESTS_SYNC_KEY,
    T.toVersioned(useTestsStore.getState().data),
  );
  const latest = useTestsStore.getState();
  const adopted = T.adoptFromServer(latest.data, synced);
  if (adopted) latest.replace(adopted);
}
const subscribeTests = (onChange: () => void) =>
  useTestsStore.subscribe((s, p) => {
    if (s.data.updatedAt !== p.data.updatedAt) onChange();
  });

/** 드릴 기록: 읽어 왔는지 돌려주고, 읽은 뒤로 서버(`ilmunta-drill`)와 맞춘다 */
export function useDrillReady(): boolean {
  const ready = useHydratedPersist(useDrillStore.persist);
  useServerSync(ready, syncDrill, subscribeDrill);
  return ready;
}

/** 시험 기록: 읽어 왔는지 돌려주고, 읽은 뒤로 서버(`ilmunta-tests`)와 맞춘다 */
export function useTestsReady(): boolean {
  const ready = useHydratedPersist(useTestsStore.persist);
  useServerSync(ready, syncTests, subscribeTests);
  return ready;
}
