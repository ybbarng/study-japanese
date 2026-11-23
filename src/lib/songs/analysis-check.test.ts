import { describe, expect, it } from "vitest";
import { checkAnalysis, formatCheck } from "./analysis-check";
import { lineHash } from "./line-hash";

// 가사는 지어낸 줄이다(공개 저장소).
const SORA = "そらのうた";
const AME = "あめのうた";
const lyrics = {
  slug: "test-song",
  lines: [{ ja: SORA }, { ja: AME }, { ja: SORA }],
};

const line = (
  index: number,
  ja: string,
  tokens = [{ start: 0, length: 2 }],
) => ({
  index,
  hash: lineHash(ja),
  tokens,
});

function analysis(lines: object[], slug = "test-song") {
  return { slug, analyzedAt: "2026-11-23", lines };
}

describe("checkAnalysis", () => {
  it("모든 가사 줄에 분석이 있으면 맞다(후렴은 지문이 같은 분석을 쓴다)", () => {
    const result = checkAnalysis(
      analysis([line(0, SORA), line(1, AME)]),
      lyrics,
    );
    expect(result).toEqual({
      ok: true,
      schemaErrors: [],
      slugMismatch: false,
      missingLines: [],
      hashMismatches: [],
      rangeErrors: [],
    });
    expect(formatCheck(result)).toEqual(["맞음: 모든 가사 줄에 분석이 있다"]);
  });

  it("빠진 가사 줄과 지문이 다른 분석 줄의 차례를 알린다", () => {
    const result = checkAnalysis(
      analysis([line(0, SORA), line(1, "ゆきのうた")]),
      lyrics,
    );
    expect(result.ok).toBe(false);
    expect(result.missingLines).toEqual([1]);
    expect(result.hashMismatches).toEqual([1]);
  });

  it("조각 위치가 줄 글자 수를 넘으면 그 차례를 알린다", () => {
    const result = checkAnalysis(
      analysis([line(0, SORA, [{ start: 4, length: 2 }]), line(1, AME)]),
      lyrics,
    );
    expect(result.ok).toBe(false);
    expect(result.rangeErrors).toEqual([0]);
  });

  it("slug가 다르면 틀린 것으로 본다", () => {
    const result = checkAnalysis(
      analysis([line(0, SORA), line(1, AME)], "other-song"),
      lyrics,
    );
    expect(result.ok).toBe(false);
    expect(result.slugMismatch).toBe(true);
  });

  it("스키마 오류는 자리와 까닭만 알린다", () => {
    const result = checkAnalysis(
      analysis([{ index: 0, hash: lineHash(SORA), tokens: [{ start: 0 }] }]),
      lyrics,
    );
    expect(result.ok).toBe(false);
    expect(result.schemaErrors).toHaveLength(1);
    expect(result.schemaErrors[0]).toMatch(/^lines\.0\.tokens\.0\.length: /);
  });

  it("보고 줄에는 가사 글을 싣지 않는다", () => {
    const result = checkAnalysis(analysis([line(1, "ゆきのうた")]), lyrics);
    expect(formatCheck(result).join("\n")).not.toMatch(/うた/);
  });
});
