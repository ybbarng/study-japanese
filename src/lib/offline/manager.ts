"use client";

import { openCache, requestPersist } from "./browser";
import {
  AUDIO_CACHE,
  DATA_CACHE,
  PAGE_CACHE,
  PICTURE_CACHE,
  STATIC_CACHE,
} from "./cache-names";
import {
  type CacheLike,
  DownloadError,
  downloadGroups,
  ERROR_TEXT,
  removeFiles,
} from "./download";
import {
  type FileKind,
  filesToRemove,
  type OfflinePack,
  packFiles,
  SHARED_PAGES,
} from "./pack";
import { savePages, saveStaticAssets, staticAssetUrls } from "./page-assets";
import { useOffline } from "./store";

// 받는 일을 한 번에 하나씩 차례로 돌린다. 앱 안에서 다른 화면으로 옮겨도(같은 탭) 계속 받는다.
// 앱을 닫거나 새로 고치면 멈추고, 다시 누르면 남은 파일부터 이어 받는다.
// 강 화면이 만든 묶음은 오디오·화면만 알아서, 받기 전에 서버에 자막·그림까지 채운 묶음을 묻는다.

/** 파일 갈래 → 넣을 캐시(service worker가 같은 이름에서 꺼낸다, cache-names.ts) */
export const CACHE_OF: Record<FileKind, string> = {
  page: PAGE_CACHE,
  audio: AUDIO_CACHE,
  data: DATA_CACHE,
  picture: PICTURE_CACHE,
};

export const cacheOfKind = (kind: FileKind): Promise<CacheLike> =>
  openCache(CACHE_OF[kind]);

const queue: OfflinePack[] = [];
let current: { id: string; controller: AbortController } | null = null;
let persistAsked = false;
let warmup: (() => Promise<unknown>) | null = null;

/**
 * 쓸 때 불러오는 코드 덩어리(펼친 재생 화면·그림 표)를 미리 불러오는 일을 맡긴다. 강을 받을 때 함께 불러
 * service worker의 빌드 파일 캐시에 담기게 한다(service-worker-register가 맡긴다)
 */
export function registerWarmup(fn: () => Promise<unknown>) {
  warmup = fn;
}

export function queueDownload(pack: OfflinePack) {
  const st = useOffline.getState();
  if (current?.id === pack.id || queue.some((p) => p.id === pack.id)) return;
  // 이미 다 채운 묶음을 저장해 두었으면 그것을 지우지 않는다(화면이 만든 묶음은 목록이 짧다)
  if (!st.packs[pack.id]?.pack.full || pack.full) st.savePack(pack, Date.now());
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
  for (const group of filesToRemove(saved.pack, others))
    await removeFiles(group.urls, await cacheOfKind(group.kind));
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

/** 이 탭이 불러온 빌드 파일 주소(/_next/static/…) */
function loadedStaticUrls(): string[] {
  const names = performance
    .getEntriesByType("resource")
    .map((e) => new URL(e.name).pathname)
    .join("\n");
  return staticAssetUrls(names);
}

/** 서버에 자막·그림까지 채운 묶음을 묻는다(server-pack.ts) */
async function fetchFullPack(
  pack: OfflinePack,
  signal: AbortSignal,
): Promise<OfflinePack> {
  let res: Response;
  try {
    res = await fetch(`/offline/pack/${pack.book}/${pack.no}`, {
      signal,
      credentials: "same-origin",
    });
  } catch {
    if (signal.aborted) throw new DownloadError("aborted", ERROR_TEXT.aborted);
    throw new DownloadError("network", ERROR_TEXT.network);
  }
  if (!res.ok)
    throw new DownloadError("http", `${ERROR_TEXT.http} (${res.status})`);
  return (await res.json()) as OfflinePack;
}

async function run(given: OfflinePack, signal: AbortSignal) {
  const st = useOffline.getState();
  const total = given.audioUrls.length;
  st.setJob(given.id, {
    phase: "running",
    progress: { done: 0, total, bytes: 0 },
  });
  if (!persistAsked) {
    persistAsked = true;
    void requestPersist();
  }
  try {
    const pack = given.full ? given : await fetchFullPack(given, signal);
    st.savePack(pack, Date.now());
    await savePages([pack.pageUrl, ...SHARED_PAGES[pack.book]], {
      pageCache: await openCache(PAGE_CACHE),
      staticCache: await openCache(STATIC_CACHE),
      fetch: (url, init) => fetch(url, init),
      signal,
    });
    // 쓸 때 불러오는 덩어리를 불러 두고, 이 탭이 지금까지 불러온 빌드 파일을 모두 담는다
    // (service worker가 화면을 맡기 전에 불러온 덩어리는 캐시에 들어가지 않았을 수 있다)
    await warmup?.().catch(() => {});
    await saveStaticAssets(loadedStaticUrls(), {
      staticCache: await openCache(STATIC_CACHE),
      fetch: (url, init) => fetch(url, init),
      signal,
    });
    const groups = [];
    for (const g of packFiles(pack))
      if (g.kind !== "page")
        groups.push({ urls: g.urls, cache: await cacheOfKind(g.kind) });
    await downloadGroups(groups, {
      fetch: (url, init) => fetch(url, init),
      signal,
      onProgress: (progress) =>
        useOffline.getState().setJob(pack.id, { phase: "running", progress }),
    });
    st.setJob(pack.id, null);
  } catch (err) {
    if (err instanceof DownloadError && err.kind === "aborted") {
      st.setJob(given.id, null);
      return;
    }
    const prev = useOffline.getState().jobs[given.id]?.progress;
    st.setJob(given.id, {
      phase: "error",
      progress: prev ?? { done: 0, total, bytes: 0 },
      message:
        err instanceof DownloadError ? err.message : "받다가 문제가 생겼습니다",
    });
  }
}
