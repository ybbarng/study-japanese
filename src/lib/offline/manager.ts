"use client";

import { openCache, requestPersist } from "./browser";
import { AUDIO_CACHE, PAGE_CACHE, STATIC_CACHE } from "./cache-names";
import { DownloadError, downloadFiles, removeFiles } from "./download";
import { type OfflinePack, SHARED_PAGES, urlsToRemove } from "./pack";
import { savePages } from "./page-assets";
import { useOffline } from "./store";

// 받는 일을 한 번에 하나씩 차례로 돌린다. 앱 안에서 다른 화면으로 옮겨도(같은 탭) 계속 받는다.
// 앱을 닫거나 새로 고치면 멈추고, 다시 누르면 남은 파일부터 이어 받는다.

const queue: OfflinePack[] = [];
let current: { id: string; controller: AbortController } | null = null;
let persistAsked = false;

export function queueDownload(pack: OfflinePack) {
  const st = useOffline.getState();
  if (current?.id === pack.id || queue.some((p) => p.id === pack.id)) return;
  st.savePack(pack, Date.now());
  st.setJob(pack.id, {
    phase: "queued",
    progress: { done: 0, total: pack.audioUrls.length, bytes: 0 },
  });
  queue.push(pack);
  void pump();
}

export function cancelDownload(id: string) {
  const at = queue.findIndex((p) => p.id === id);
  if (at >= 0) {
    queue.splice(at, 1);
    useOffline.getState().setJob(id, null);
  }
  if (current?.id === id) current.controller.abort();
}

export async function removePack(id: string) {
  cancelDownload(id);
  const st = useOffline.getState();
  const saved = st.packs[id];
  if (!saved) return;
  const others = Object.values(st.packs).map((p) => p.pack);
  const urls = urlsToRemove(saved.pack, others);
  await removeFiles(urls, await openCache(AUDIO_CACHE));
  await removeFiles([saved.pack.pageUrl], await openCache(PAGE_CACHE));
  st.forgetPack(id);
  st.setJob(id, null);
  st.bump();
}

export function isBusy(id: string): boolean {
  return current?.id === id || queue.some((p) => p.id === id);
}

async function pump() {
  if (current) return;
  const pack = queue.shift();
  if (!pack) return;
  const controller = new AbortController();
  current = { id: pack.id, controller };
  try {
    await run(pack, controller.signal);
  } finally {
    current = null;
    useOffline.getState().bump();
    void pump();
  }
}

async function run(pack: OfflinePack, signal: AbortSignal) {
  const st = useOffline.getState();
  const total = pack.audioUrls.length;
  st.setJob(pack.id, {
    phase: "running",
    progress: { done: 0, total, bytes: 0 },
  });
  if (!persistAsked) {
    persistAsked = true;
    void requestPersist();
  }
  try {
    await savePages([pack.pageUrl, ...SHARED_PAGES[pack.book]], {
      pageCache: await openCache(PAGE_CACHE),
      staticCache: await openCache(STATIC_CACHE),
      fetch: (url, init) => fetch(url, init),
      signal,
    });
    await downloadFiles(pack.audioUrls, {
      cache: await openCache(AUDIO_CACHE),
      fetch: (url, init) => fetch(url, init),
      signal,
      onProgress: (progress) =>
        useOffline.getState().setJob(pack.id, { phase: "running", progress }),
    });
    st.setJob(pack.id, null);
  } catch (err) {
    if (err instanceof DownloadError && err.kind === "aborted") {
      st.setJob(pack.id, null);
      return;
    }
    const prev = useOffline.getState().jobs[pack.id]?.progress;
    st.setJob(pack.id, {
      phase: "error",
      progress: prev ?? { done: 0, total, bytes: 0 },
      message:
        err instanceof DownloadError ? err.message : "받다가 문제가 생겼습니다",
    });
  }
}
