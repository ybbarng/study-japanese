import { describe, expect, it } from "vitest";
import {
  addResult,
  adoptFromServer,
  bestScore,
  emptyTestsData,
  MAX_RESULTS,
  type TestResult,
  toVersioned,
} from "./test-state";

const result = (over: Partial<TestResult>): TestResult => ({
  month: 4,
  at: new Date(2027, 3, 30, 20).getTime(),
  score: 90,
  correct: 27,
  total: 30,
  passed: true,
  wrong: [],
  ...over,
});

describe("시험 결과 기록", () => {
  it("결과를 더하면 끝낸 시각이 문서의 updatedAt이 된다", () => {
    const r = result({});
    const d = addResult(emptyTestsData(), r);
    expect(d.results).toEqual([r]);
    expect(d.updatedAt).toBe(r.at);
  });

  it("달마다 가장 높은 점수를 찾는다", () => {
    let d = emptyTestsData();
    d = addResult(d, result({ score: 80, at: 1 }));
    d = addResult(d, result({ score: 93, at: 2 }));
    d = addResult(d, result({ month: 5, score: 100, at: 3 }));
    expect(bestScore(d, 4)).toBe(93);
    expect(bestScore(d, 6)).toBeNull();
  });

  it(`최근 ${MAX_RESULTS}개만 남긴다`, () => {
    let d = emptyTestsData();
    for (let i = 1; i <= MAX_RESULTS + 5; i++)
      d = addResult(d, result({ at: i }));
    expect(d.results).toHaveLength(MAX_RESULTS);
    expect(d.results[0].at).toBe(6);
  });

  it("서버 문서가 새것이면 받아들이고, 모양이 틀리면 버린다", () => {
    const server = addResult(emptyTestsData(), result({}));
    expect(
      adoptFromServer(emptyTestsData(), toVersioned(server))?.results,
    ).toHaveLength(1);
    expect(
      adoptFromServer(emptyTestsData(), {
        value: { results: "x" },
        updatedAt: 5,
      }),
    ).toBeNull();
  });
});
