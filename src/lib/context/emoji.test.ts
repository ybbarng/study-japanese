import { describe, expect, it } from "vitest";
import { EMOJI, emojiOf } from "./emoji";

describe("emojiOf", () => {
  it("기본형 낱말의 그림 문자를 돌려준다", () => {
    expect(emojiOf("猫")).toBe("🐈");
    expect(emojiOf("電車")).toBe("🚃");
  });

  it("표에 없는 낱말(추상어·문법어)은 undefined", () => {
    expect(emojiOf("今日")).toBeUndefined();
    expect(emojiOf("意味")).toBeUndefined();
  });

  it("Object의 기본 속성 이름에는 걸리지 않는다", () => {
    expect(emojiOf("toString")).toBeUndefined();
  });
});

describe("EMOJI 표", () => {
  it("값은 모두 그림 문자 한 개(글자 묶음 하나)이고 글자·숫자가 섞이지 않는다", () => {
    const segmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });
    const bad = Object.entries(EMOJI).filter(
      ([, e]) =>
        [...segmenter.segment(e)].length !== 1 || /[\p{L}\p{N}]/u.test(e),
    );
    expect(bad).toEqual([]);
  });
});
