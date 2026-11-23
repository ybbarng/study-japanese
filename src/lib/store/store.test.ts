import { describe, expect, it } from "vitest";
import { openDb } from "./db";
import {
  addListenEvents,
  type ListenEvent,
  listAllListenEvents,
  summarizeListening,
} from "./listen";
import { getState, putState } from "./state";

const T0 = Date.UTC(2027, 0, 1, 23, 30); // 2027-01-02 08:30 KST 출근길

function listen(overrides: Partial<ListenEvent> = {}): ListenEvent {
  return {
    clientId: crypto.randomUUID(),
    book: "ilmuta",
    item: "01-1",
    kind: "example",
    startedAt: T0,
    listenedSec: 35.2,
    completed: true,
    ...overrides,
  };
}

describe("상태 문서", () => {
  it("처음 저장한 문서를 그대로 읽는다", () => {
    const db = openDb(":memory:");
    putState(db, { key: "kana", value: { cards: { a: 2 } }, updatedAt: T0 });
    expect(getState(db, "kana")).toEqual({
      key: "kana",
      value: { cards: { a: 2 } },
      updatedAt: T0,
    });
  });

  it("더 늦게 고친 문서가 이전 문서를 바꾼다", () => {
    const db = openDb(":memory:");
    putState(db, { key: "kana", value: { v: 1 }, updatedAt: T0 });
    const r = putState(db, { key: "kana", value: { v: 2 }, updatedAt: T0 + 1 });
    expect(r).toEqual({
      applied: true,
      current: { key: "kana", value: { v: 2 }, updatedAt: T0 + 1 },
    });
  });

  it("오래된 기기가 늦게 보낸 옛 문서는 무시하고 지금 문서를 돌려준다", () => {
    const db = openDb(":memory:");
    putState(db, { key: "kana", value: { v: 2 }, updatedAt: T0 + 10 });
    const r = putState(db, { key: "kana", value: { v: 1 }, updatedAt: T0 });
    expect(r).toEqual({
      applied: false,
      current: { key: "kana", value: { v: 2 }, updatedAt: T0 + 10 },
    });
  });

  it("없는 키는 null", () => {
    expect(getState(openDb(":memory:"), "nothing")).toBeNull();
  });
});

describe("들은 기록", () => {
  it("같은 clientId를 다시 보내도 한 번만 들어간다(오프라인 재전송)", () => {
    const db = openDb(":memory:");
    const e = listen();
    expect(addListenEvents(db, [e])).toBe(1);
    expect(addListenEvents(db, [e, listen({ item: "01-2" })])).toBe(1);
    expect(listAllListenEvents(db).map((x) => x.item)).toEqual([
      "01-1",
      "01-2",
    ]);
  });

  it("항목별로 재생 횟수·끝까지 들은 횟수·들은 시간을 모은다", () => {
    const db = openDb(":memory:");
    addListenEvents(db, [
      listen({
        item: "L01",
        kind: "lecture",
        listenedSec: 500,
        completed: true,
      }),
      listen({
        item: "L01",
        kind: "lecture",
        listenedSec: 120,
        completed: false,
        startedAt: T0 + 5000,
      }),
      listen({ item: "01-1", listenedSec: 35 }),
      listen({ book: "ilmunta", item: "L01-01", kind: "lecture" }),
    ]);
    expect(summarizeListening(db, "ilmuta")).toEqual([
      {
        item: "01-1",
        kind: "example",
        plays: 1,
        completedPlays: 1,
        listenedSec: 35,
        lastAt: T0,
      },
      {
        item: "L01",
        kind: "lecture",
        plays: 2,
        completedPlays: 1,
        listenedSec: 620,
        lastAt: T0 + 5000,
      },
    ]);
  });
});
