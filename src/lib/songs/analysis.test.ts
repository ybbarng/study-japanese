import { describe, expect, it } from "vitest";
import { cutTokens, mergeAnalysis, songAnalysisSchema } from "./analysis";
import { lineHash } from "./line-hash";

// 가사는 실제 노래가 아니라 지어낸 줄이다(공개 저장소).
const SORA = "空を見ていた";
const UTA = "テストのうた";

/** 空(0,1) · 見ていた(2,4). を는 덮지 않는다 */
const soraTokens = [
  { start: 0, length: 1, reading: "そら", pos: "名詞", gloss: "하늘" },
  {
    start: 2,
    length: 4,
    reading: "みていた",
    base: "見る",
    gloss: "보고 있었다",
  },
];

function analysis(over: object = {}) {
  return {
    slug: "test-song",
    analyzedAt: "2026-11-23",
    lines: [
      {
        index: 0,
        hash: lineHash(SORA),
        tokens: soraTokens,
        grammar: [
          {
            pattern: "〜ていた",
            explain: "하고 있었다",
            ref: { book: "ilmuta", lesson: 12 },
          },
        ],
      },
      { index: 1, hash: lineHash(UTA), tokens: [{ start: 0, length: 3 }] },
    ],
    ...over,
  };
}

const firstIssue = (raw: unknown) =>
  songAnalysisSchema.safeParse(raw).error?.issues[0];

describe("lineHash", () => {
  it("sha256 앞 8자리 16진수이고 글이 한 글자만 달라도 바뀐다", () => {
    expect(lineHash(SORA)).toMatch(/^[0-9a-f]{8}$/);
    expect(lineHash(SORA)).not.toBe(lineHash("空を見ていた。"));
  });
});

describe("분석 파일 스키마", () => {
  it("맞는 분석 파일을 받는다", () => {
    expect(songAnalysisSchema.safeParse(analysis()).success).toBe(true);
  });

  it("가사 글자를 담는 surface 필드는 받지 않는다", () => {
    const line = {
      index: 0,
      hash: lineHash(SORA),
      tokens: [{ start: 0, length: 1, surface: "空" }],
    };
    expect(firstIssue(analysis({ lines: [line] }))?.path).toEqual([
      "lines",
      0,
      "tokens",
      0,
    ]);
  });

  it("앞 조각과 겹치는 조각은 그 조각의 start 자리 오류로 거부한다", () => {
    const line = {
      index: 0,
      hash: lineHash(SORA),
      tokens: [
        { start: 0, length: 2 },
        { start: 1, length: 1 },
      ],
    };
    const issue = firstIssue(analysis({ lines: [line] }));
    expect(issue?.path).toEqual(["lines", 0, "tokens", 1, "start"]);
    expect(issue?.message).toBe("조각이 앞 조각과 겹치거나 차례가 뒤바뀜");
  });

  it("같은 index를 두 번 적으면 두 번째 줄의 index 자리 오류로 거부한다", () => {
    const line = { index: 0, hash: lineHash(UTA), tokens: [] };
    expect(firstIssue(analysis({ lines: [line, line] }))?.path).toEqual([
      "lines",
      1,
      "index",
    ]);
  });

  it.each([
    ["지문 모양이 틀림", { index: 0, hash: "xyz" }, ["lines", 0, "hash"]],
    [
      "길이 0인 조각",
      { index: 0, hash: lineHash(SORA), tokens: [{ start: 0, length: 0 }] },
      ["lines", 0, "tokens", 0, "length"],
    ],
    [
      "없는 교재",
      {
        index: 0,
        hash: lineHash(SORA),
        grammar: [
          { pattern: "〜", explain: "x", ref: { book: "x", lesson: 1 } },
        ],
      },
      ["lines", 0, "grammar", 0, "ref", "book"],
    ],
  ])("%s은 거부한다", (_, line, path) => {
    expect(firstIssue(analysis({ lines: [line] }))?.path).toEqual(path);
  });
});

describe("cutTokens", () => {
  it("줄 글을 위치대로 잘라 화면 조각을 만들고, 덮지 않은 글은 plain 조각으로 채운다", () => {
    expect(cutTokens(SORA, soraTokens)).toEqual([
      { surface: "空", reading: "そら", pos: "名詞", gloss: "하늘" },
      { surface: "を", plain: true },
      {
        surface: "見ていた",
        reading: "みていた",
        base: "見る",
        gloss: "보고 있었다",
      },
    ]);
  });

  it("위치는 코드포인트 단위다(UTF-16 둘을 쓰는 글자도 한 글자)", () => {
    // 𠮟(U+20B9F)는 UTF-16으로 두 칸이다
    expect(cutTokens("𠮟る", [{ start: 1, length: 1 }])).toEqual([
      { surface: "𠮟", plain: true },
      { surface: "る" },
    ]);
  });

  it("조각이 줄 글자 수를 넘으면 null", () => {
    expect(cutTokens("そら", [{ start: 1, length: 2 }])).toBeNull();
  });
});

describe("mergeAnalysis(가사 줄과 분석을 차례·지문으로 맞춘다)", () => {
  const parsed = songAnalysisSchema.parse(analysis());

  it("같은 차례·같은 지문인 줄에 분석을 붙인다", () => {
    const merged = mergeAnalysis([{ ja: SORA }, { ja: UTA }], parsed);
    expect(merged.analyzed).toBe(true);
    expect(merged.staleCount).toBe(0);
    expect(merged.byLine[0]?.tokens[0].surface).toBe("空");
    expect(merged.byLine[0]?.grammar[0].pattern).toBe("〜ていた");
    expect(merged.byLine[1]?.grammar).toEqual([]);
  });

  it("후렴처럼 다른 차례에 같은 글이 다시 나오면 지문이 같은 분석을 쓴다", () => {
    const merged = mergeAnalysis(
      [{ ja: SORA }, { ja: UTA }, { ja: SORA }],
      parsed,
    );
    expect(merged.byLine[2]?.tokens[0].gloss).toBe("하늘");
    expect(merged.staleCount).toBe(0);
  });

  it("글이 바뀐 줄은 분석 없이 두고 그 수를 센다", () => {
    const merged = mergeAnalysis(
      [{ ja: "空を見た" }, { ja: UTA }, { ja: "あたらしいうた" }],
      parsed,
    );
    expect(merged.byLine.map((l) => l !== null)).toEqual([false, true, false]);
    expect(merged.staleCount).toBe(2);
  });

  it("분석이 없으면 모든 줄이 분석 없고, 어긋난 줄은 0이다", () => {
    expect(mergeAnalysis([{ ja: SORA }], null)).toEqual({
      analyzed: false,
      byLine: [null],
      staleCount: 0,
    });
  });
});
