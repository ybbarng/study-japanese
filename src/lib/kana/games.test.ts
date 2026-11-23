import { describe, expect, it } from "vitest";
import type { CardId } from "./data";
import { gamePool, pickPairs, rushFallMs, rushPoints } from "./games";
import { seededRng } from "./quiz";

describe("gamePool", () => {
  it("아무것도 안 배웠으면 첫 레슨 글자로 채운다", () => {
    expect(gamePool([], "hira", 4)).toEqual([
      "hira:a",
      "hira:i",
      "hira:u",
      "hira:e",
    ]);
  });

  it("배운 글자가 충분하면 그 글자 종류만 쓴다", () => {
    const learned: CardId[] = [
      "hira:sa",
      "hira:shi",
      "kata:sa",
      "hira:su",
      "hira:se",
    ];
    expect(gamePool(learned, "hira", 4)).toEqual([
      "hira:sa",
      "hira:shi",
      "hira:su",
      "hira:se",
    ]);
  });

  it("섞기는 두 글자 종류를 모두 넣는다", () => {
    const pool = gamePool([], "mix", 8);
    expect(pool.some((c) => c.startsWith("hira:"))).toBe(true);
    expect(pool.some((c) => c.startsWith("kata:"))).toBe(true);
  });
});

describe("빠르게 읽기 점수·속도", () => {
  it("5연속마다 한 문제 점수가 1점씩 오른다", () => {
    expect([0, 4, 5, 9, 10].map(rushPoints)).toEqual([1, 1, 2, 2, 3]);
  });

  it("연속으로 맞힐수록 빨라지되 1.4초보다 빠르지 않다", () => {
    expect(rushFallMs(0)).toBe(4000);
    expect(rushFallMs(4)).toBe(3400);
    expect(rushFallMs(100)).toBe(1400);
  });
});

describe("pickPairs", () => {
  it("두 글자 종류 모두 배운 글자를 먼저 고른다", () => {
    const learned = new Set<CardId>([
      "hira:a",
      "kata:a",
      "hira:ka",
      "kata:ka",
      "hira:sa",
    ]);
    const pairs = pickPairs(learned, 2, seededRng(1));
    expect([...pairs].sort()).toEqual(["a", "ka"]);
  });

  it("모자라면 기본 글자에서 겹치지 않게 채운다", () => {
    const pairs = pickPairs(new Set(), 6, seededRng(2));
    expect(pairs).toHaveLength(6);
    expect(new Set(pairs).size).toBe(6);
  });
});
