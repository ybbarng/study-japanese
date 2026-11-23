import { describe, expect, it } from "vitest";
import { fakeExample, fakeLesson } from "./__fixtures__/lesson";
import { lessonSteps, listenOnlyExamples, parseStep } from "./steps";

describe("강의 학습 단계", () => {
  it("글이 다 있는 강은 강의부터 쓰기까지 일곱 단계다", () => {
    expect(lessonSteps(fakeLesson(1))).toEqual([
      "lecture",
      "words",
      "patterns",
      "conversation",
      "shadowing",
      "listen",
      "writing",
    ]);
  });

  it("0강은 강의 하나뿐이다", () => {
    expect(lessonSteps(fakeLesson(0))).toEqual(["lecture"]);
  });

  it("글을 못 뽑은 코너의 단계는 건너뛴다", () => {
    const lesson = fakeLesson(2, {
      examples: [fakeExample("02-2", "words"), fakeExample("02-5", "exercise")],
    });
    expect(lessonSteps(lesson)).toEqual(["lecture", "listen", "writing"]);
  });

  it("듣기만 하는 코너는 기본 회화 듣기·연습 문제·장문이다", () => {
    const lesson = fakeLesson(5, {
      examples: [
        fakeExample("05-1", "dialogue"),
        fakeExample("05-2", "words"),
        fakeExample("05-6", "longReading"),
      ],
    });
    expect(listenOnlyExamples(lesson).map((e) => e.id)).toEqual([
      "05-1",
      "05-6",
    ]);
  });
});

describe("주소의 단계 읽기", () => {
  it("있는 단계면 그대로", () => {
    expect(parseStep("words", ["lecture", "words"])).toBe("words");
  });

  it("없거나 모르는 값이면 첫 단계", () => {
    expect(parseStep("writing", ["lecture"])).toBe("lecture");
    expect(parseStep(undefined, ["lecture"])).toBe("lecture");
  });
});
