import { describe, expect, it } from "vitest";
import { fakeExample, fakeLesson } from "./__fixtures__/lesson";
import { buildGlossary, rubySegments, splitOkurigana } from "./ruby";

describe("낱말 하나의 읽는 법 나누기", () => {
  it("뒤에 붙은 같은 가나는 루비 밖으로 뺀다", () => {
    expect(splitOkurigana("食べる", "たべる")).toEqual([
      { text: "食", reading: "た" },
      { text: "べる" },
    ]);
  });

  it("앞에 붙은 같은 가나도 루비 밖으로 뺀다", () => {
    expect(splitOkurigana("お茶", "おちゃ")).toEqual([
      { text: "お" },
      { text: "茶", reading: "ちゃ" },
    ]);
  });

  it("한자만 있는 낱말은 통째로 읽는 법을 단다", () => {
    expect(splitOkurigana("学生", "がくせい")).toEqual([
      { text: "学生", reading: "がくせい" },
    ]);
  });
});

describe("배운 단어로 사전 만들기", () => {
  const lessons = [
    fakeLesson(1),
    fakeLesson(2, {
      examples: [
        fakeExample("02-2", "words", {
          sentences: [
            { ja: "川", ko: "강", reading: "かわ" },
            { ja: "うん", ko: "응", reading: "うん" },
          ],
        }),
      ],
      conversationWords: [{ ja: "冗談", ko: "농담", reading: "じょうだん" }],
    }),
  ];

  it("그 강까지의 단어 코너와 회화 단어에서 한자 낱말만 모은다", () => {
    expect(buildGlossary(lessons, 2)).toEqual({
      山: "やま",
      川: "かわ",
      冗談: "じょうだん",
    });
  });

  it("아직 배우지 않은 강의 단어는 넣지 않는다", () => {
    expect(buildGlossary(lessons, 1)).toEqual({ 山: "やま" });
  });
});

describe("문장에 읽는 법 달기", () => {
  it("사전에 있는 낱말에만 읽는 법을 달고 나머지는 이어 붙인다", () => {
    expect(rubySegments("山は高い。", { 山: "やま" })).toEqual([
      { text: "山", reading: "やま" },
      { text: "は高い。" },
    ]);
  });

  it("겹치는 낱말이 있으면 더 긴 쪽을 고른다", () => {
    expect(
      rubySegments("会社員だ", { 会社: "かいしゃ", 会社員: "かいしゃいん" }),
    ).toEqual([{ text: "会社員", reading: "かいしゃいん" }, { text: "だ" }]);
  });

  it("사전이 비면 문장 그대로 한 조각이다", () => {
    expect(rubySegments("やあ。", {})).toEqual([{ text: "やあ。" }]);
  });
});
