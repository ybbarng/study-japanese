import { describe, expect, it } from "vitest";
import type { ListenEvent } from "@/lib/store/listen";
import {
  enqueue,
  flushQueue,
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

describe("대기열 보내기", () => {
  it("끊긴 채 시작한 보내기가 끝나기 전에 다시 연결되면, 끝난 뒤 한 번 더 보내 서버에 남긴다", async () => {
    const s = memoryStorage();
    enqueue(event("aaaaaaaa"), s);
    // 첫 요청은 끊긴 통신이라 늦게 실패하고, 그 사이 다시 연결되어(online) 보내기를 다시 부른다
    let failFirst: (e: Error) => void = () => {};
    const calls: string[] = [];
    const fakeFetch = ((_url: string) => {
      calls.push("fetch");
      if (calls.length === 1)
        return new Promise((_, reject) => {
          failFirst = reject;
        });
      return Promise.resolve(new Response("{}", { status: 200 }));
    }) as typeof fetch;

    const first = flushQueue(fakeFetch, s);
    const onOnline = flushQueue(fakeFetch, s);
    failFirst(new Error("offline"));
    await Promise.all([first, onOnline]);

    expect(calls).toEqual(["fetch", "fetch"]);
    expect(readQueue(s)).toEqual([]);
  });

  it("보낼 것이 없으면 요청하지 않는다", async () => {
    const calls: string[] = [];
    const fakeFetch = (() => {
      calls.push("fetch");
      return Promise.resolve(new Response("{}"));
    }) as unknown as typeof fetch;
    await flushQueue(fakeFetch, memoryStorage());
    expect(calls).toEqual([]);
  });
});
