import type { ListenEvent } from "@/lib/store/listen";

// 들은 기록을 폰에 모았다가 서버로 보낸다. 걷는 중 통신이 끊겨도 빠지지 않게
// localStorage에 쌓고, 서버가 받은 것만 지운다(서버는 clientId로 중복을 막는다).

const KEY = "sj-listen-queue";
const MAX = 2000;

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function safeStorage(): KeyValueStorage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function readQueue(
  storage: KeyValueStorage | null = safeStorage(),
): ListenEvent[] {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(events: ListenEvent[], storage: KeyValueStorage | null) {
  if (!storage) return;
  try {
    storage.setItem(KEY, JSON.stringify(events.slice(-MAX)));
  } catch {
    // 저장 공간이 꽉 찼으면 이번 기록만 잃는다
  }
}

export function enqueue(
  event: ListenEvent,
  storage: KeyValueStorage | null = safeStorage(),
) {
  writeQueue([...readQueue(storage), event], storage);
}

export function removeSent(
  sentIds: Set<string>,
  storage: KeyValueStorage | null = safeStorage(),
) {
  writeQueue(
    readQueue(storage).filter((e) => !sentIds.has(e.clientId)),
    storage,
  );
}

let flushing: Promise<void> | null = null;

/** 대기열을 보낸다. 실패하면 남겨 두고 다음 기회(온라인 복귀·화면 전환)에 다시 보낸다. */
export function flushQueue(fetchImpl: typeof fetch = fetch): Promise<void> {
  if (flushing) return flushing;
  flushing = (async () => {
    const events = readQueue();
    if (events.length === 0) return;
    try {
      const batch = events.slice(0, 500);
      const res = await fetchImpl("/api/listen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: batch }),
        keepalive: true,
      });
      if (res.ok) removeSent(new Set(batch.map((e) => e.clientId)));
    } catch {
      // 오프라인
    }
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}
