import { describe, expect, it } from "vitest";
import { fakeExample } from "./__fixtures__/lesson";
import { groupByPattern } from "./patterns";

describe("문형별로 예문 묶기", () => {
  const example = fakeExample("01-3", "patterns", {
    patterns: [
      { no: 1, ja: "～は～。", ko: "~는 ~야." },
      { no: 2, ja: "～？", ko: "~야?" },
    ],
    sentences: [
      { ja: "山は高い。", ko: "", pattern: 1 },
      { ja: "山？", ko: "", pattern: 2 },
      { ja: "川は長い。", ko: "", pattern: 1 },
      { ja: "やあ。", ko: "" },
    ],
  });

  it("문형 머리 차례대로 그 문형의 예문을 모으고 짝 없는 예문은 맨 뒤에 둔다", () => {
    expect(
      groupByPattern(example).map((g) => [
        g.head?.no ?? null,
        g.sentences.map((s) => s.ja),
      ]),
    ).toEqual([
      [1, ["山は高い。", "川は長い。"]],
      [2, ["山？"]],
      [null, ["やあ。"]],
    ]);
  });

  it("모든 예문이 짝이 있으면 남는 묶음이 없다", () => {
    const tidy = { ...example, sentences: example.sentences.slice(0, 3) };
    expect(groupByPattern(tidy)).toHaveLength(2);
  });
});
