import { describe, expect, it } from "vitest";
import { fakeExample, fakeLesson } from "@/lib/ilmuta/__fixtures__/lesson";
import { learnedThrough } from "@/lib/kana/lessons";
import { BRIDGE_BY_ID } from "./bridges";
import { pickForBridge, pickReadableSentences } from "./pick";

// 교재 글을 옮기지 않고 모양만 같은 가짜 문장을 쓴다.
const lesson1 = fakeLesson(1, {
  examples: [
    fakeExample("01-2", "words", {
      sentences: [
        { ja: "林", ko: "숲", reading: "はやし" },
        { ja: "あか", ko: "빨강" },
      ],
    }),
    fakeExample("01-3", "patterns", {
      sentences: [
        { ja: "あおいそら。", ko: "파란 하늘." },
        { ja: "かぎだ。", ko: "열쇠다." },
        { ja: "林のうえ。", ko: "숲 위." },
      ],
    }),
    fakeExample("01-4-1", "conversationBasic", {
      sentences: [{ ja: "あおいそら。", ko: "파란 하늘." }],
    }),
  ],
});
const lesson2 = fakeLesson(2, {
  examples: [
    fakeExample("02-3", "patterns", {
      sentences: [
        { ja: "ケーキ、たべる？", ko: "케이크 먹을래?" },
        { ja: "すしをたべる。", ko: "초밥을 먹는다." },
      ],
    }),
  ],
});
const lessons = [fakeLesson(0), lesson1, lesson2];

describe("pickReadableSentences", () => {
  it("문장 코너를 낱말 코너보다 먼저 두고, 못 읽는 문장과 두 박 이하 낱말은 뺀다", () => {
    const picked = pickReadableSentences(lessons, learnedThrough("h5"), {
      lessonNos: [1],
    });
    expect(picked.map((s) => s.ja)).toEqual([
      "あおいそら。",
      "林のうえ。",
      "林",
    ]);
  });

  it("회화 코너에 다시 나온 같은 문장은 한 번만 고른다", () => {
    const picked = pickReadableSentences(lessons, learnedThrough("h5"), {
      lessonNos: [1],
    });
    expect(picked.filter((s) => s.ja === "あおいそら。")).toHaveLength(1);
  });

  it("한자 낱말은 그 강까지 배운 단어의 읽는 법을 후리가나로 단다", () => {
    const [, withKanji] = pickReadableSentences(lessons, learnedThrough("h5"), {
      lessonNos: [1],
    });
    expect(withKanji.pieces[0]).toMatchObject({
      kind: "kanji",
      text: "林",
      reading: "はやし",
    });
  });

  it("강마다 최대 문장 수를 넘기지 않는다", () => {
    const picked = pickReadableSentences(lessons, learnedThrough("h5"), {
      lessonNos: [1],
      maxPerLesson: 1,
    });
    expect(picked.map((s) => s.ja)).toEqual(["あおいそら。"]);
  });

  it("문장마다 그 문장이 든 예문 mp3를 함께 돌려준다", () => {
    const [first] = pickReadableSentences(lessons, learnedThrough("h5"), {
      lessonNos: [1],
    });
    expect(first).toMatchObject({
      lessonNo: 1,
      exampleId: "01-3",
      exampleFile: "2. 예문 mp3/01-3.mp3",
      ko: "파란 하늘.",
    });
  });

  it("너무 짧은 줄(최소 박 수 미만)은 고르지 않는다", () => {
    const picked = pickReadableSentences(lessons, learnedThrough("h5"), {
      lessonNos: [1],
      minMora: 4,
    });
    expect(picked.map((s) => s.ja)).toEqual(["あおいそら。", "林のうえ。"]);
  });
});

describe("pickForBridge", () => {
  it("가타카나 다리는 가타카나가 든 문장만 고른다", () => {
    const bridge = BRIDGE_BY_ID.get("read-k");
    if (!bridge) throw new Error("다리 없음");
    const picked = pickForBridge(lessons, bridge);
    expect(picked.map((s) => s.ja)).toEqual(["ケーキ、たべる？"]);
  });

  it("히라가나 다리는 히라가나 기본 레슨(h5)까지 배운 글자로 고른다", () => {
    const bridge = BRIDGE_BY_ID.get("read-h");
    if (!bridge) throw new Error("다리 없음");
    const picked = pickForBridge(lessons, bridge);
    expect(picked.map((s) => s.ja)).not.toContain("かぎだ。");
    expect(picked.map((s) => s.ja)).toContain("あおいそら。");
  });
});
