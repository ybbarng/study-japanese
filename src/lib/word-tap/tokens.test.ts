import { describe, expect, it } from "vitest";
import { kanaForm, neighborToken, tapTokens } from "./tokens";
import type { WordTapSentence } from "./types";

// 지어낸 문장
const analysis: WordTapSentence = {
  tokens: [
    { surface: "山", reading: "やま", pos: "名詞", gloss: "산" },
    { surface: "は", pos: "助詞", gloss: "~은/는" },
    { surface: "。", plain: true },
  ],
  grammar: [],
};

describe("tapTokens", () => {
  it("낱말 분석이 있으면 그 낱말 조각을 쓴다", () => {
    expect(tapTokens("山は。", analysis, true)).toBe(analysis.tokens);
  });

  it("분석이 없고 글자 도움을 펼친 강이면 글자 하나씩 누르게 하고 문장 부호는 누르지 않는다", () => {
    expect(tapTokens("きょう、", undefined, true)).toEqual([
      { surface: "きょ", charOnly: true },
      { surface: "う", charOnly: true },
      { surface: "、", plain: true },
    ]);
  });

  it("분석이 없고 글자 도움을 접은 강이면 누를 조각이 없다", () => {
    expect(tapTokens("きょう", undefined, false)).toBeNull();
  });

  it("문장 부호뿐인 글은 누를 조각이 없다", () => {
    expect(tapTokens("……", undefined, true)).toBeNull();
  });
});

describe("kanaForm", () => {
  it("한자 낱말은 읽는 법, 가나 낱말은 겉모양", () => {
    expect(kanaForm(analysis.tokens[0])).toBe("やま");
    expect(kanaForm(analysis.tokens[1])).toBe("は");
  });
});

describe("neighborToken", () => {
  it("문장 부호를 건너뛰고 앞뒤 낱말로 옮긴다", () => {
    expect(neighborToken(analysis.tokens, 0, 1)).toBe(1);
    expect(neighborToken(analysis.tokens, 1, 1)).toBeNull();
    expect(neighborToken(analysis.tokens, 1, -1)).toBe(0);
  });
});
