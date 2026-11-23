import { describe, expect, it } from "vitest";
import { fakeExample, fakeLesson } from "@/lib/ilmuta/__fixtures__/lesson";
import {
  ilmuntaCardSource,
  ilmutaCardSource,
  lessonNoOfItem,
} from "./card-sources";

describe("항목 이름에서 강·과 번호", () => {
  it.each([
    ["L10", 10],
    ["L10-01", 10],
    ["10-3", 10],
    ["07-4-1", 7],
  ])("%s → %d", (item, no) => {
    expect(lessonNoOfItem(item)).toBe(no);
  });

  it("모양이 다르면 null", () => {
    expect(lessonNoOfItem("extra")).toBeNull();
  });
});

describe("일무따 카드 재료", () => {
  const lessons = [
    fakeLesson(1),
    fakeLesson(2, {
      examples: [
        fakeExample("02-2", "words", {
          sentences: [{ ja: "川", ko: "강", reading: "かわ" }],
        }),
      ],
    }),
  ];

  it("그 강의 소책자 문장만 맞출 후보로 둔다", () => {
    expect(ilmutaCardSource(lessons, 2).sentences.map((s) => s.ja)).toEqual([
      "川",
    ]);
  });

  it("낱말과 읽는 법은 그 강까지 배운 단어로 단다", () => {
    const src = ilmutaCardSource(lessons, 2);
    expect(src.words.map((w) => w.ja)).toEqual(["山", "川"]);
    expect(src.glossary).toEqual({ 山: "やま", 川: "かわ" });
    expect(ilmutaCardSource(lessons, 1).words.map((w) => w.ja)).toEqual(["山"]);
  });
});

describe("일문따 카드 재료", () => {
  it("짝이 없으면 문장 후보는 비우고 드릴 낱말을 쓴다", () => {
    const src = ilmuntaCardSource(null);
    expect(src.sentences).toEqual([]);
    expect(src.words.length).toBeGreaterThan(50);
    expect(src.words.some((w) => w.ja === "山")).toBe(false);
  });

  it("자막에서 찾은 짝을 문장 후보로 쓰고 출처를 받아 적은 글로 둔다", () => {
    const src = ilmuntaCardSource(null, [
      {
        ja: "猫が好きです。",
        ko: "고양이를 좋아합니다.",
        start: 1,
        end: 6,
        score: 1,
      },
    ]);
    expect(src.sentences).toEqual([
      { ja: "猫が好きです。", ko: "고양이를 좋아합니다." },
    ]);
    expect(src.origin).toBe("transcript");
  });

  it("일무따를 볼 수 있으면 일무따 단어도 낱말로 쓴다", () => {
    const src = ilmuntaCardSource([fakeLesson(1)]);
    expect(src.words.find((w) => w.ja === "山")).toEqual({
      ja: "山",
      reading: "やま",
      ko: "산",
    });
    expect(src.glossary.山).toBe("やま");
  });
});
