import { describe, expect, it } from "vitest";
import { lineHash } from "@/lib/songs/line-hash";
import {
  lessonSentences,
  mergeTextbookAnalysis,
  textbookAnalysisSchema,
} from "./analysis";
import { checkTextbookAnalysis, formatTextbookCheck } from "./analysis-check";

// 교재 글이 아니라 모양만 같은 지어낸 문장
const PATTERN = "山は山だ。";
const TALK = "やあ、テスト。";

const lesson = {
  examples: [
    {
      id: "01-2",
      kind: "words" as const,
      sentences: [{ ja: "山", ko: "산" }],
    },
    {
      id: "01-3",
      kind: "patterns" as const,
      sentences: [{ ja: PATTERN, ko: "산은 산이다." }],
    },
    {
      id: "01-4-1",
      kind: "conversationBasic" as const,
      sentences: [{ ja: TALK, ko: "안녕, 시험." }],
    },
    {
      id: "01-4-2",
      kind: "conversationAdvanced" as const,
      sentences: [{ ja: TALK, ko: "안녕, 시험." }],
    },
  ],
};

const patternTokens = [
  { start: 0, length: 1, reading: "やま", pos: "名詞", gloss: "산" },
  { start: 1, length: 1, pos: "助詞", gloss: "~은/는" },
];

function file(sentences: object[]) {
  return {
    book: "ilmuta",
    lesson: 1,
    analyzedAt: "2026-11-24",
    by: "claude",
    sentences,
  };
}

const full = file([
  {
    example: "01-3",
    index: 0,
    hash: lineHash(PATTERN),
    tokens: patternTokens,
    grammar: [{ pattern: "〜は〜だ", explain: "~은 ~이다." }],
  },
  {
    example: "01-4-1",
    index: 0,
    hash: lineHash(TALK),
    tokens: [{ start: 0, length: 2, pos: "感動詞", gloss: "어이" }],
  },
]);

describe("lessonSentences", () => {
  it("단어 코너는 빼고 문장 예문만 차례대로 낸다", () => {
    expect(
      lessonSentences(lesson).map((s) => `${s.example}#${s.index}`),
    ).toEqual(["01-3#0", "01-4-1#0", "01-4-2#0"]);
  });
});

describe("textbookAnalysisSchema", () => {
  it("문장 글(surface 같은 모르는 필드)을 받지 않는다", () => {
    const withText = file([
      { example: "01-3", index: 0, hash: lineHash(PATTERN), surface: PATTERN },
    ]);
    expect(textbookAnalysisSchema.safeParse(withText).success).toBe(false);
  });

  it("같은 자리를 두 번 적으면 받지 않는다", () => {
    const twice = file([
      { example: "01-3", index: 0, hash: lineHash(PATTERN) },
      { example: "01-3", index: 0, hash: lineHash(PATTERN) },
    ]);
    expect(textbookAnalysisSchema.safeParse(twice).success).toBe(false);
  });
});

describe("mergeTextbookAnalysis", () => {
  it("문장 글로 찾을 수 있게 조각을 잘라 붙이고, 덮지 않은 글은 plain으로 채운다", () => {
    const merged = mergeTextbookAnalysis(
      lessonSentences(lesson),
      textbookAnalysisSchema.parse(full),
    );
    expect(merged.analyses[PATTERN].tokens.map((t) => t.surface)).toEqual([
      "山",
      "は",
      "山だ。",
    ]);
    expect(merged.analyses[PATTERN].tokens[2].plain).toBe(true);
    expect(merged.analyses[PATTERN].grammar).toHaveLength(1);
  });

  it("같은 글이 다른 예문에 되풀이되면 한 번 분석한 것을 쓴다", () => {
    const merged = mergeTextbookAnalysis(
      lessonSentences(lesson),
      textbookAnalysisSchema.parse(full),
    );
    expect(merged.missing).toEqual([]);
    expect(merged.analyses[TALK].tokens[0].surface).toBe("やあ");
  });

  it("교재 글이 바뀌어 지문이 다르면 그 문장은 분석 없이 둔다", () => {
    const merged = mergeTextbookAnalysis(
      [{ example: "01-3", index: 0, ja: "山は川だ。" }],
      textbookAnalysisSchema.parse(full),
    );
    expect(merged.analyses).toEqual({});
    expect(merged.missing).toHaveLength(1);
  });
});

describe("checkTextbookAnalysis", () => {
  const target = {
    book: "ilmuta",
    lesson: 1,
    sentences: lessonSentences(lesson),
  };

  it("모든 문장에 맞는 분석이 있으면 맞음", () => {
    const result = checkTextbookAnalysis(full, target);
    expect(result.ok).toBe(true);
    expect(formatTextbookCheck(result)).toEqual([
      "맞음: 이 강의 모든 예문에 분석이 있다",
    ]);
  });

  it("빠진 문장·없는 자리·지문 틀림·위치 넘침을 자리로 알린다", () => {
    const broken = file([
      { example: "01-3", index: 0, hash: lineHash("다른 글") },
      {
        example: "01-4-1",
        index: 0,
        hash: lineHash(TALK),
        tokens: [{ start: 6, length: 3 }],
      },
      { example: "09-9", index: 0, hash: lineHash(TALK) },
    ]);
    const result = checkTextbookAnalysis(broken, target);
    expect(result.ok).toBe(false);
    expect(result.hashMismatches).toEqual(["01-3#0"]);
    expect(result.rangeErrors).toEqual(["01-4-1#0"]);
    expect(result.unknownRefs).toEqual(["09-9#0"]);
    expect(result.missing).toEqual(["01-3#0", "01-4-1#0", "01-4-2#0"]);
  });

  it("다른 강의 파일이면 알린다", () => {
    const result = checkTextbookAnalysis({ ...full, lesson: 2 }, target);
    expect(result.lessonMismatch).toBe(true);
    expect(result.ok).toBe(false);
  });

  it("보고에 교재 글을 싣지 않는다", () => {
    const result = checkTextbookAnalysis(file([]), target);
    const text = formatTextbookCheck(result).join("\n");
    expect(text).not.toContain(PATTERN);
    expect(text).toContain("01-3#0");
  });
});
