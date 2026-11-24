import { describe, expect, it } from "vitest";
import { fakeLesson } from "./__fixtures__/lesson";
import { followStep, stepOfItem } from "./follow-step";
import { lessonSteps } from "./steps";

const lesson = fakeLesson(1);
const steps = lessonSteps(lesson);

describe("재생기 항목이 보이는 단계", () => {
  it("강의는 강의 단계, 글 있는 예문은 그 단계, 듣기만 하는 예문은 더 듣기", () => {
    expect(stepOfItem(lesson, "L01")).toBe("lecture");
    expect(stepOfItem(lesson, "01-2")).toBe("words");
    expect(stepOfItem(lesson, "01-3")).toBe("patterns");
    expect(stepOfItem(lesson, "01-4-2")).toBe("conversation");
    expect(stepOfItem(lesson, "01-1")).toBe("listen");
  });

  it("다른 강의 항목이면 없다", () => {
    expect(stepOfItem(lesson, "02-2")).toBeNull();
  });
});

describe("트랙이 넘어갈 때 옮길 단계", () => {
  it("강의 단계에서 듣다가 단어 예문으로 넘어가면 단어 단계로", () => {
    expect(followStep(lesson, steps, "lecture", "01-1", "01-2")).toBe("words");
  });

  it("방금 끝난 예문의 단계에 있었으면 다음 예문 단계로", () => {
    expect(followStep(lesson, steps, "words", "01-2", "01-3")).toBe("patterns");
  });

  it("듣기만 하는 예문으로 넘어가면 옮기지 않는다", () => {
    expect(followStep(lesson, steps, "lecture", "L01", "01-1")).toBeNull();
    expect(
      followStep(lesson, steps, "conversation", "01-4-2", "01-5"),
    ).toBeNull();
  });

  it("다른 일(쓰기 등)을 하고 있으면 그대로 둔다", () => {
    expect(followStep(lesson, steps, "writing", "01-2", "01-3")).toBeNull();
  });

  it("같은 단계 안에서 넘어가면(회화 Basic → Advanced) 옮길 것이 없다", () => {
    expect(
      followStep(lesson, steps, "conversation", "01-4-1", "01-4-2"),
    ).toBeNull();
  });

  it("처음 트는 것(앞 트랙 없음)은 따라 옮기지 않는다", () => {
    expect(followStep(lesson, steps, "lecture", null, "01-2")).toBeNull();
  });
});
