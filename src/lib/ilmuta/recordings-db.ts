"use client";

import { type TakeMeta, takesToPrune } from "./recording";

// 따라 말하기 녹음을 폰 안 IndexedDB에 둔다(서버에 올리지 않는다).
// IndexedDB를 못 쓰면(사생활 보호 창 등) 이 화면을 여는 동안만 메모리에 둔다.

export interface Take extends TakeMeta {
  blob: Blob;
}

const DB = "sj-recordings";
const STORE = "takes";
/** 예문마다 남길 녹음 수 */
export const KEEP_PER_EXAMPLE = 5;

const memory = new Map<string, Take>();

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => {
        const store = req.result.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("lesson", "lesson");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function run<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function listTakes(lesson: number): Promise<Take[]> {
  const db = await open();
  const takes = db
    ? await run<Take[]>(db, "readonly", (s) =>
        s.index("lesson").getAll(lesson),
      ).catch(() => [])
    : [...memory.values()].filter((t) => t.lesson === lesson);
  return takes.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteTake(id: string): Promise<void> {
  memory.delete(id);
  const db = await open();
  if (db) await run(db, "readwrite", (s) => s.delete(id)).catch(() => {});
}

/** 새 녹음을 넣고, 예문마다 오래된 것은 지운다 */
export async function addTake(take: Take): Promise<void> {
  const db = await open();
  if (!db) memory.set(take.id, take);
  else
    await run(db, "readwrite", (s) => s.put(take)).catch(() => {
      memory.set(take.id, take);
    });
  const all = await listTakes(take.lesson);
  for (const id of takesToPrune(all, KEEP_PER_EXAMPLE)) await deleteTake(id);
}
