import { describe, expect, it } from "vitest";
import type { CardId } from "./data";
import {
  chartViewFor,
  introKeyAction,
  lessonConfusables,
  showCompare,
} from "./lesson-side";

describe("곁칸 글자표를 단계마다 어떻게 보일지", () => {
  it("알아보기 중에는 읽는 법과 소리를 가린다", () => {
    expect(chartViewFor("quiz")).toEqual({
      readings: false,
      glyphs: "all",
      sound: false,
    });
  });

  it("쓰기 중에는 아직 쓰지 않은 글자 모양을 가린다", () => {
    expect(chartViewFor("write").glyphs).toBe("written");
  });

  it("소개·낱말 단계에서는 다 보이고 소리가 난다", () => {
    expect(chartViewFor("intro")).toEqual({
      readings: true,
      glyphs: "all",
      sound: true,
    });
    expect(chartViewFor("words")).toEqual(chartViewFor("intro"));
  });

  it("비슷한 글자 비교는 알아보기 중에만 감춘다", () => {
    expect(showCompare("quiz")).toBe(false);
    expect(showCompare("intro")).toBe(true);
  });
});

describe("이 레슨의 헷갈리는 짝", () => {
  const sa: CardId = "hira:sa";
  const chi: CardId = "hira:chi";
  const ki: CardId = "hira:ki";

  it("짝의 다른 글자를 이미 배웠으면 보인다", () => {
    expect(lessonConfusables([sa], new Set([ki]))).toEqual([[sa, ki]]);
  });

  it("짝의 다른 글자를 아직 안 배웠으면 보이지 않는다", () => {
    expect(lessonConfusables([sa], new Set())).toEqual([]);
  });

  it("짝 둘이 다 이 레슨 글자면 보인다", () => {
    expect(lessonConfusables([sa, chi], new Set())).toEqual([[sa, chi]]);
  });
});

describe("소개 단계 키", () => {
  const body = { tag: "BODY", editable: false };
  const key = (k: string, tag = "BODY") => ({
    key: k,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    isComposing: false,
    target: tag === "BODY" ? body : { tag, editable: false },
  });

  it("Enter는 다음, Backspace는 앞, 1은 소리 듣기", () => {
    expect(introKeyAction(key("Enter"))).toBe("next");
    expect(introKeyAction(key("Backspace"))).toBe("prev");
    expect(introKeyAction(key("1"))).toBe("listen");
  });

  it("단추에 초점이 있으면 Enter는 단추가 받게 둔다", () => {
    expect(introKeyAction(key("Enter", "BUTTON"))).toBeNull();
  });

  it("입력칸에서 친 키는 받지 않는다", () => {
    expect(
      introKeyAction({
        ...key("Backspace"),
        target: { tag: "INPUT", type: "text", editable: false },
      }),
    ).toBeNull();
  });
});
