import { describe, expect, it } from "vitest";
import { glossCore, mergeGlosses } from "./glosses";

// 지어낸 낱말 뜻(교재 글이 아니다)

describe("mergeGlosses", () => {
  it("괄호 설명만 다른 뜻과 앞 뜻들의 조각으로만 된 뜻은 빼고, 새 뜻만 남긴다", () => {
    expect(mergeGlosses(["나무(큰 것)", "숲", "나무", "숲, 나무"], 4)).toEqual([
      "나무(큰 것)",
      "숲",
    ]);
  });

  it("쉼표 차례만 다른 뜻은 하나로 본다", () => {
    expect(mergeGlosses(["달다, 맛있다", "맛있다, 달다", "맛있다"], 4)).toEqual(
      ["달다, 맛있다"],
    );
  });

  it("띄어쓰기만 다른 뜻은 하나로 본다", () => {
    expect(mergeGlosses(["잘 가요", "잘가요"], 4)).toEqual(["잘 가요"]);
  });

  it("일부 조각만 새로우면 그 조각만 다른 뜻으로 남긴다(괄호 설명은 지킨다)", () => {
    expect(mergeGlosses(["어느 집", "어느 집, 누구 집(높임)"], 4)).toEqual([
      "어느 집",
      "누구 집(높임)",
    ]);
  });

  it("괄호 안 쉼표로는 나누지 않는다", () => {
    expect(mergeGlosses(["나(남자, 거친 말)", "나"], 4)).toEqual([
      "나(남자, 거친 말)",
    ]);
  });

  it("괄호뿐인 뜻은 괄호 안 글로 견준다", () => {
    expect(mergeGlosses(["(부드럽게 하는 말)", "(높이는 말)"], 4)).toEqual([
      "(부드럽게 하는 말)",
      "(높이는 말)",
    ]);
  });

  it("뜻은 max개까지만 둔다", () => {
    expect(mergeGlosses(["가", "나", "다", "라", "마"], 3)).toEqual([
      "가",
      "나",
      "다",
    ]);
  });

  it("빈 뜻은 버린다", () => {
    expect(mergeGlosses(["", " ", "산"], 4)).toEqual(["산"]);
  });
});

describe("glossCore", () => {
  it("괄호 설명과 공백을 뺀다", () => {
    expect(glossCore("살펴 가요(헤어질 때)")).toBe("살펴가요");
  });
});
