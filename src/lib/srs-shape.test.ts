import { describe, expect, it } from "vitest";
import { newCard } from "@/lib/kana/srs";
import { readSrsCard, readSrsCards } from "./srs-shape";

const card = newCard(Date.UTC(2027, 0, 1));

describe("readSrsCard", () => {
  it("복습 카드 모양이면 같은 값을 돌려주고 모르는 필드는 버린다", () => {
    expect(readSrsCard({ ...card, extra: 1 })).toEqual(card);
  });

  it("횟수가 소수면 null", () => {
    expect(readSrsCard({ ...card, reps: 1.5 })).toBeNull();
  });

  it("맞힘 여부가 불리언이 아니면 null", () => {
    expect(readSrsCard({ ...card, lastCorrect: "yes" })).toBeNull();
  });
});

describe("readSrsCards", () => {
  it("카드 하나라도 모양이 틀리면 통째로 null", () => {
    expect(readSrsCards({ a: card, b: { ...card, box: -1 } })).toBeNull();
  });

  it("배열은 카드 묶음으로 받지 않는다", () => {
    expect(readSrsCards([card])).toBeNull();
  });
});
