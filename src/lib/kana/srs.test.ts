import { describe, expect, it } from "vitest";
import {
  type CardState,
  DAY,
  dueQueue,
  INTERVALS,
  MAX_BOX,
  MINUTE,
  masteryOf,
  newCard,
  review,
} from "./srs";

const T0 = Date.UTC(2027, 0, 1, 0, 0, 0);

function card(over: Partial<CardState> = {}): CardState {
  return { ...newCard(T0), ...over };
}

describe("review", () => {
  it("새 카드를 맞히면 상자 1로 올라가 하루 뒤에 다시 본다", () => {
    const next = review(newCard(T0), true, T0);
    expect(next.box).toBe(1);
    expect(next.due).toBe(T0 + DAY);
  });

  it("틀리면 상자 0으로 내려가 10분 뒤에 다시 보고 틀린 횟수가 는다", () => {
    const next = review(card({ box: 4, due: T0 }), false, T0);
    expect(next).toMatchObject({
      box: 0,
      due: T0 + 10 * MINUTE,
      lapses: 1,
      lastCorrect: false,
    });
  });

  it("때가 안 된 카드는 맞혀도 상자가 오르지 않는다", () => {
    const c = card({ box: 2, due: T0 + DAY });
    const next = review(c, true, T0);
    expect(next.box).toBe(2);
    expect(next.due).toBe(T0 + DAY);
    expect(next.reps).toBe(1);
  });

  it("맨 위 상자에서는 더 오르지 않고 가장 긴 간격을 쓴다", () => {
    const next = review(card({ box: MAX_BOX, due: T0 }), true, T0);
    expect(next.box).toBe(MAX_BOX);
    expect(next.due).toBe(T0 + INTERVALS[MAX_BOX]);
  });
});

describe("dueQueue", () => {
  it("마지막에 틀린 카드를 먼저, 그다음 간격 대비 많이 늦은 카드를 낸다", () => {
    const now = T0 + 10 * DAY;
    const cards = {
      "hira:a": card({ box: 3, due: now - 1 * DAY }), // 4일 간격에 1일 늦음
      "hira:i": card({ box: 1, due: now - 1 * DAY }), // 1일 간격에 1일 늦음
      "hira:u": card({ box: 0, due: now - MINUTE, lastCorrect: false }),
      "hira:e": card({ box: 2, due: now + DAY }), // 아직
    };
    expect(dueQueue(cards, now)).toEqual(["hira:u", "hira:i", "hira:a"]);
  });

  it("개수 제한을 넘지 않는다", () => {
    const cards = Object.fromEntries(
      ["a", "i", "u", "e", "o"].map((s) => [`hira:${s}`, card()]),
    );
    expect(dueQueue(cards, T0, 3)).toHaveLength(3);
  });
});

describe("masteryOf", () => {
  it("상자 번호에 따라 익힌 정도를 나눈다", () => {
    expect(masteryOf(undefined)).toBe("none");
    expect(masteryOf(card({ box: 1 }))).toBe("learning");
    expect(masteryOf(card({ box: 3 }))).toBe("familiar");
    expect(masteryOf(card({ box: 4 }))).toBe("solid");
  });
});
