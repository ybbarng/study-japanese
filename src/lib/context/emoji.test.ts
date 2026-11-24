import { describe, expect, it } from "vitest";
import { EMOJI, EMOJI_TABLES, emojiOf, lookupForms } from "./emoji";

describe("emojiOf", () => {
  it("기본형 낱말의 그림 문자를 돌려준다", () => {
    expect(emojiOf("猫")).toBe("🐈");
    expect(emojiOf("電車")).toBe("🚃");
  });

  it("표에 없는 낱말(추상어·문법어)은 undefined", () => {
    expect(emojiOf("今日")).toBeUndefined();
    expect(emojiOf("意味")).toBeUndefined();
  });

  it("다른 낱말 속에 자주 끼는 한 글자는 그림을 두지 않는다", () => {
    for (const ja of ["人", "日", "子", "目", "火", "木", "足"])
      expect([ja, emojiOf(ja)]).toEqual([ja, undefined]);
  });

  it("～する 동사와 ～な 형용사는 앞부분의 그림을 쓴다", () => {
    expect(emojiOf("勉強する")).toBe(EMOJI.勉強);
    expect(emojiOf("静かな")).toBe(EMOJI.静か);
  });

  it("Object의 기본 속성 이름에는 걸리지 않는다", () => {
    expect(emojiOf("toString")).toBeUndefined();
    expect(emojiOf("constructor")).toBeUndefined();
  });
});

describe("lookupForms", () => {
  it("문장 끝 구두점을 떼고, ～する·～な를 뗀 꼴을 덧붙인다", () => {
    expect(lookupForms("掃除する。")).toEqual(["掃除する", "掃除"]);
    expect(lookupForms("好きな")).toEqual(["好きな", "好き"]);
  });

  it("뗀 앞부분이 한 글자면 덧붙이지 않는다", () => {
    expect(lookupForms("する")).toEqual(["する"]);
    expect(lookupForms("変な")).toEqual(["変な"]);
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

  it("국기 그림 문자(지역 표시 글자 둘)는 쓰지 않는다", () => {
    const flags = Object.entries(EMOJI).filter(([, e]) =>
      /\p{Regional_Indicator}/u.test(e),
    );
    expect(flags).toEqual([]);
  });

  it("같은 낱말이 두 분야 표에 들어가지 않는다", () => {
    const owner = new Map<string, string>();
    const twice: string[] = [];
    for (const [name, table] of Object.entries(EMOJI_TABLES))
      for (const ja of Object.keys(table)) {
        const prev = owner.get(ja);
        if (prev) twice.push(`${ja}: ${prev}, ${name}`);
        owner.set(ja, name);
      }
    expect(twice).toEqual([]);
  });
});
