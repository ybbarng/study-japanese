import { z } from "zod";
import {
  ANALYSIS_BOOKS,
  analysisTokenSchema,
  cutTokens,
  grammarNoteSchema,
  type LineAnalysis,
  MAX_TOKENS_PER_LINE,
  refineTokenOrder,
  type ShownAnalysis,
} from "@/lib/songs/analysis";
import { LINE_HASH_PATTERN, lineHash } from "@/lib/songs/line-hash";
import type { Example } from "@/lib/textbook/schema";

// 교재 예문 낱말 분석(content/textbook-analysis/<book>/<lesson>.json, git 밖). docs/textbook-analysis.md.
//
// 노래 분석과 같은 꼴이다. 예문 글자는 넣지 않고, 문장은 예문 mp3 id·그 안 차례와 글의 지문(sha256 앞 8자리)으로,
// 낱말은 문장 안 글자 위치(코드포인트, 0부터)로 가리킨다. 화면 글은 서버가 교재 문장에서 잘라 만든다.
// 지금은 세션이 손으로 쓰고, 뒤에는 형태소 분석기(kuromoji)가 같은 꼴로 쓴다(by로 구분).
// 지문에 node:crypto를 쓰므로 서버 전용이다. 클라이언트는 타입만 가져간다.

/** 예문 id(파일 이름에서 확장자를 뺀 것, 예: 01-3, 01-4-1) */
const EXAMPLE_ID = /^[0-9A-Za-z_-]{1,30}$/;

export const sentenceAnalysisSchema = z
  .strictObject({
    /** 예문 mp3 id(교재 데이터의 examples[].id) */
    example: z.string().regex(EXAMPLE_ID),
    /** 그 예문 안 문장 차례(0부터, examples[].sentences의 차례) */
    index: z.number().int().min(0).max(499),
    /** 문장 글의 지문(`pnpm textbook:analysis-check --list`가 찍는다) */
    hash: z.string().regex(LINE_HASH_PATTERN),
    tokens: z.array(analysisTokenSchema).max(MAX_TOKENS_PER_LINE).default([]),
    grammar: z.array(grammarNoteSchema).max(10).optional(),
  })
  .superRefine(refineTokenOrder);
export type SentenceAnalysis = z.infer<typeof sentenceAnalysisSchema>;

/** 분석한 쪽: 세션(사람 손을 거친 것 포함)·형태소 분석기 */
export const ANALYZERS = ["claude", "kuromoji"] as const;

export const textbookAnalysisSchema = z
  .strictObject({
    book: z.enum(ANALYSIS_BOOKS),
    lesson: z.number().int().min(0).max(99),
    analyzedAt: z.union([z.iso.date(), z.iso.datetime({ offset: true })]),
    by: z.enum(ANALYZERS).optional(),
    sentences: z.array(sentenceAnalysisSchema).max(2000),
  })
  .superRefine((analysis, ctx) => {
    const seen = new Set<string>();
    analysis.sentences.forEach((s, i) => {
      const key = refKey(s);
      if (seen.has(key))
        ctx.addIssue({
          code: "custom",
          message: "같은 예문·차례의 문장을 두 번 적음",
          path: ["sentences", i, "index"],
        });
      seen.add(key);
    });
  });
export type TextbookAnalysis = z.infer<typeof textbookAnalysisSchema>;

/** 분석할 교재 문장 하나의 자리 */
export interface SentenceRef {
  example: string;
  index: number;
  ja: string;
}

export function refKey(ref: { example: string; index: number }): string {
  return `${ref.example}#${ref.index}`;
}

/** 낱말 분석을 붙일 예문 갈래. 단어 코너(낱말 하나)·연습 문제는 뺀다 */
const SENTENCE_KINDS = new Set<Example["kind"]>([
  "dialogue",
  "patterns",
  "conversationBasic",
  "conversationAdvanced",
  "longReading",
  "grammarExamples",
  "reading",
]);

/** 한 강에서 낱말 분석을 붙일 문장들(예문 차례대로) */
export function lessonSentences(lesson: {
  examples: readonly Pick<Example, "id" | "kind" | "sentences">[];
}): SentenceRef[] {
  return lesson.examples
    .filter((e) => SENTENCE_KINDS.has(e.kind))
    .flatMap((e) =>
      e.sentences.map((s, index) => ({ example: e.id, index, ja: s.ja })),
    );
}

/** 문장 글 → 화면에 보일 분석. 화면은 보이는 문장 글로 찾아 쓴다 */
export type WordTapAnalyses = Record<string, ShownAnalysis>;

export interface MergedTextbookAnalysis {
  analyses: WordTapAnalyses;
  /** 맞는 분석이 없는 문장(분석이 없거나 글이 바뀌었다) */
  missing: SentenceRef[];
}

/**
 * 교재 문장과 분석을 맞춘다. 같은 예문·차례에 지문이 같으면 그 분석을, 아니면 지문이 같은 다른 분석을 쓴다
 * (회화 Basic·Advanced처럼 같은 문장이 되풀이되면 한 번만 분석해도 된다).
 */
export function mergeTextbookAnalysis(
  sentences: readonly SentenceRef[],
  analysis: Pick<TextbookAnalysis, "sentences"> | null,
): MergedTextbookAnalysis {
  const analyses: WordTapAnalyses = {};
  const missing: SentenceRef[] = [];
  const byRef = new Map(analysis?.sentences.map((s) => [refKey(s), s]));
  const byHash = new Map<string, Pick<LineAnalysis, "tokens" | "grammar">>();
  for (const s of analysis?.sentences ?? [])
    if (!byHash.has(s.hash)) byHash.set(s.hash, s);
  for (const ref of sentences) {
    const hash = lineHash(ref.ja);
    const at = byRef.get(refKey(ref));
    const found = at?.hash === hash ? at : byHash.get(hash);
    const tokens = found ? cutTokens(ref.ja, found.tokens) : null;
    if (!found || !tokens) {
      missing.push(ref);
      continue;
    }
    analyses[ref.ja] ??= { tokens, grammar: found.grammar ?? [] };
  }
  return { analyses, missing };
}
