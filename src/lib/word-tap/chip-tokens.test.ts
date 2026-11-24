import { describe, expect, it } from "vitest";
import { chipKey, chipTokens } from "./chip-tokens";
import { neighborToken } from "./tokens";

// 교재 글이 아니라 모양만 같은 가짜 낱말을 쓴다(저장소 규칙)

const words = [
  { ja: "山", reading: "やま", ko: "산", emoji: "⛰️" },
  { ja: "とても", ko: "아주" },
];

describe("낱말 칩을 정보 창 조각으로", () => {
  it("표기·읽는 법·뜻을 조각의 겉모양·읽기·뜻으로 옮긴다", () => {
    expect(chipTokens(words)).toEqual([
      { surface: "山", reading: "やま", gloss: "산" },
      { surface: "とても", gloss: "아주" },
    ]);
  });

  it("모든 칩이 누를 조각이라 ←·→로 칩 사이를 옮긴다", () => {
    const tokens = chipTokens(words);
    expect(neighborToken(tokens, 0, 1)).toBe(1);
    expect(neighborToken(tokens, 1, 1)).toBeNull();
  });

  it("열쇠는 칩 차례로 만들고 분석 문장 글과 겹치지 않게 머리를 붙인다", () => {
    expect(chipKey(words)).toBe("chips:山|とても");
  });
});
