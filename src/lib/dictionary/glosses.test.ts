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

  it("뒤 뜻이 앞 뜻 끝 괄호 속 말과 같으면 뺀다", () => {
    expect(mergeGlosses(["달리다(뛰다)", "뛰다"], 3)).toEqual(["달리다(뛰다)"]);
  });

  it("괄호 속 말과 「~하다」만 다른 뜻도 같은 뜻으로 본다", () => {
    expect(mergeGlosses(["잠자다(수면)", "수면하다"], 3)).toEqual([
      "잠자다(수면)",
    ]);
  });

  it("뒤 뜻 끝 괄호 속 말이 앞에 나온 뜻이면 그 괄호를 뗀다", () => {
    expect(mergeGlosses(["배, 선박(배)"], 3)).toEqual(["배, 선박"]);
    expect(mergeGlosses(["배", "선박(배)"], 3)).toEqual(["배", "선박"]);
  });

  it("앞에 붙은 괄호와 쉼표가 든 괄호는 다른 말로 보지 않는다", () => {
    expect(mergeGlosses(["(바로)옆", "바로"], 3)).toEqual(["(바로)옆", "바로"]);
    expect(mergeGlosses(["나(남자, 거친 말)", "남자"], 3)).toEqual([
      "나(남자, 거친 말)",
      "남자",
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
