import { describe, expect, it } from "vitest";
import { VERBS } from "./verbs";
import { drillLessonOf, WORD_LESSONS } from "./word-lessons";
import { ADJECTIVES } from "./words";

describe("낱말이 처음 나오는 과", () => {
  it("드릴 낱말은 모두 word-lessons.ts에 있다(새 낱말을 더하면 pnpm ilmunta:word-lessons를 다시 돌린다)", () => {
    const missing = [...VERBS, ...ADJECTIVES]
      .map((w) => w.dict)
      .filter((d) => !(d in WORD_LESSONS));
    expect(missing).toEqual([]);
  });

  it("일무따에 나온 낱말은 처음부터, 일문따에만 나온 낱말은 그 과부터, 교재에 없는 낱말은 처음부터 쓴다", () => {
    expect(WORD_LESSONS.飲む).toEqual({ ilmunta: 8, ilmuta: 9 });
    expect(drillLessonOf("飲む")).toBe(0);
    expect(WORD_LESSONS.走る).toEqual({ ilmunta: 15 });
    expect(drillLessonOf("走る")).toBe(15);
    expect(WORD_LESSONS.減る).toEqual({});
    expect(drillLessonOf("減る")).toBe(0);
  });

  it("verbs.ts·words.ts의 낱말에 쓰기 시작하는 과가 붙어 있다", () => {
    expect(VERBS.find((v) => v.dict === "走る")?.lesson).toBe(15);
    expect(ADJECTIVES.find((a) => a.dict === "医者")?.lesson).toBe(2);
  });
});
