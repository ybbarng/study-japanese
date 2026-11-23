import { describe, expect, it } from "vitest";
import type { ListenEvent } from "@/lib/store/listen";
import {
  enqueue,
  type KeyValueStorage,
  readQueue,
  removeSent,
} from "./listen-queue";

function memoryStorage(): KeyValueStorage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
  };
}

function event(clientId: string): ListenEvent {
  return {
    clientId,
    book: "ilmuta",
    item: "L00",
    kind: "lecture",
    startedAt: Date.UTC(2027, 0, 1),
    listenedSec: 480,
    completed: true,
  };
}

describe("들은 기록 대기열", () => {
  it("쌓은 순서대로 읽고, 서버가 받은 것만 지운다", () => {
    const s = memoryStorage();
    enqueue(event("aaaaaaaa"), s);
    enqueue(event("bbbbbbbb"), s);
    enqueue(event("cccccccc"), s);
    removeSent(new Set(["aaaaaaaa", "cccccccc"]), s);
    expect(readQueue(s).map((e) => e.clientId)).toEqual(["bbbbbbbb"]);
  });

  it("저장된 값이 깨져 있으면 빈 대기열로 본다", () => {
    const s = memoryStorage();
    s.setItem("sj-listen-queue", "{not json");
    expect(readQueue(s)).toEqual([]);
  });

  it("저장소를 쓸 수 없는 환경(비공개 창 등)에서도 오류 없이 빈 대기열", () => {
    expect(readQueue(null)).toEqual([]);
    expect(() => enqueue(event("dddddddd"), null)).not.toThrow();
  });
});
