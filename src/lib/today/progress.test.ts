import { describe, expect, it } from "vitest";
import { newCard } from "@/lib/kana/srs";
import { countInRange, kanaProgress } from "./progress";

describe("kanaProgress", () => {
  it("배우기 시작한 글자를 세고, 전체는 히라가나·가타카나 레슨 글자 219자다", () => {
    const card = newCard(0);
    expect(
      kanaProgress({ "hira:a": card, "hira:ka": card, "kata:a": card }),
    ).toEqual({ learned: 3, total: 219 });
  });
});

describe("countInRange", () => {
  it("범위 밖 번호(0강 등)는 세지 않는다", () => {
    expect(countInRange(new Set([0, 1, 2, 60, 61]), 1, 60)).toBe(3);
  });
});
