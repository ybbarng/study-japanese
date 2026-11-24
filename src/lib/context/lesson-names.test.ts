import { describe, expect, it } from "vitest";
import { fakeExample, fakeLesson } from "@/lib/ilmuta/__fixtures__/lesson";
import { analysisGlossary, hangulOfKana, lessonNames } from "./lesson-names";

// 가짜 회화와 가짜 이름을 쓴다(교재 글이 아니다)

const lesson = fakeLesson(3, {
  examples: [
    fakeExample("03-4-1", "conversationBasic", {
      sentences: [
        {
          ja: "花子、これ誰の？",
          ko: "하나코, 이거 누구 거야?",
          speaker: "田中 花子",
        },
        { ja: "うん。", ko: "응.", speaker: "ミナ" },
      ],
    }),
  ],
});
const tokens: Record<string, { surface: string; reading?: string }[]> = {
  "花子、これ誰の？": [
    { surface: "花子", reading: "はなこ" },
    { surface: "、" },
    { surface: "これ" },
    { surface: "誰", reading: "だれ" },
    { surface: "の" },
    { surface: "？" },
  ],
};
const tokensOf = (ja: string) => tokens[ja] ?? null;

describe("그 강 등장인물 이름", () => {
  it("이름표 마디마다, 한자 마디는 대사 분석의 읽기를 빌려 이름 낱말로", () => {
    expect(lessonNames(lesson, tokensOf)).toEqual([
      { ja: "花子", reading: "はなこ", ko: "하나코" },
      { ja: "ミナ", ko: "미나" },
    ]);
  });

  it("대사에서 읽기를 찾지 못한 한자 마디(田中)는 뺀다", () => {
    expect(lessonNames(lesson, tokensOf).map((w) => w.ja)).not.toContain(
      "田中",
    );
  });
});

describe("가나의 한글 근사치", () => {
  it("ん은 앞 글자 받침 ㄴ으로, 장음은 적지 않는다", () => {
    expect(hangulOfKana("サンウー")).toBe("산우");
  });
});

describe("대사 분석의 한자 읽기", () => {
  it("한자가 든 낱말만 읽기와 함께 모은다", () => {
    expect(analysisGlossary(lesson, tokensOf)).toEqual({
      花子: "はなこ",
      誰: "だれ",
    });
  });
});
