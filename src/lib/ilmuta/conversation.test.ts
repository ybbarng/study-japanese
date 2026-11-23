import { describe, expect, it } from "vitest";
import { fakeExample, fakeLesson } from "./__fixtures__/lesson";
import { conversationScripts, speakerSides } from "./conversation";

describe("말풍선 자리", () => {
  it("처음 말한 사람은 왼쪽, 다음 사람은 오른쪽이다", () => {
    const sides = speakerSides([
      { ja: "やあ。", ko: "", speaker: "B" },
      { ja: "うん。", ko: "", speaker: "A" },
      { ja: "ね。", ko: "", speaker: "B" },
    ]);
    expect([...sides]).toEqual([
      ["B", "left"],
      ["A", "right"],
    ]);
  });

  it("세 번째 사람은 다시 왼쪽이다", () => {
    const sides = speakerSides([
      { ja: "1", ko: "", speaker: "A" },
      { ja: "2", ko: "", speaker: "B" },
      { ja: "3", ko: "", speaker: "C" },
    ]);
    expect(sides.get("C")).toBe("left");
  });
});

describe("회화 대본 묶기", () => {
  it("Basic과 Advanced의 대본이 같으면 오디오 둘을 한 대본에 묶는다", () => {
    const scripts = conversationScripts(fakeLesson(1));
    expect(scripts.map((s) => s.examples.map((e) => e.id))).toEqual([
      ["01-4-1", "01-4-2"],
    ]);
  });

  it("대본이 다르면 따로 둔다", () => {
    const lesson = fakeLesson(1, {
      examples: [
        fakeExample("01-4-1", "conversationBasic", {
          sentences: [{ ja: "やあ。", ko: "", speaker: "A" }],
        }),
        fakeExample("01-4-2", "conversationAdvanced", {
          sentences: [{ ja: "ね。", ko: "", speaker: "A" }],
        }),
      ],
    });
    expect(conversationScripts(lesson).map((s) => s.sentences[0].ja)).toEqual([
      "やあ。",
      "ね。",
    ]);
  });

  it("글이 없는 회화 예문은 대본에 넣지 않는다", () => {
    const lesson = fakeLesson(1, {
      examples: [fakeExample("01-4-1", "conversationBasic")],
    });
    expect(conversationScripts(lesson)).toEqual([]);
  });
});
