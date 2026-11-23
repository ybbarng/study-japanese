import type { ConnectionLike } from "./auto";
import type { CacheLike } from "./download";

// 브라우저 기능 감싸기. 없는 브라우저에서도 던지지 않고 없음으로 돌려준다.

export function offlineSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "caches" in window &&
    "serviceWorker" in navigator
  );
}

export async function openCache(name: string): Promise<CacheLike> {
  return caches.open(name);
}

/** 안드로이드 Chrome의 연결 정보. 없으면 undefined(설정 자체를 숨긴다) */
export function getConnection(): (ConnectionLike & EventTarget) | undefined {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as { connection?: ConnectionLike & EventTarget })
    .connection;
}

export interface StorageInfo {
  usage: number;
  quota: number;
}

export async function storageEstimate(): Promise<StorageInfo | null> {
  try {
    const e = await navigator.storage?.estimate();
    if (!e) return null;
    return { usage: e.usage ?? 0, quota: e.quota ?? 0 };
  } catch {
    return null;
  }
}

/** 브라우저가 공간이 모자랄 때 지우지 않게 해 두었는지. 알 수 없으면 null */
export async function persistStatus(): Promise<boolean | null> {
  try {
    return (await navigator.storage?.persisted()) ?? null;
  } catch {
    return null;
  }
}

export async function requestPersist(): Promise<boolean | null> {
  try {
    return (await navigator.storage?.persist()) ?? null;
  } catch {
    return null;
  }
}
