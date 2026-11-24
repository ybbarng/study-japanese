import { z } from "zod";
import { LINE_HASH_PATTERN, lineHash } from "./line-hash";
import { MAX_LINES, SLUG_PATTERN, type SongLine } from "./schema";

// 노래 분석 파일(content/songs/<slug>.json). Claude 세션이 가사를 읽고 쓴다(docs/song-analysis.md).
//
// 가사 글자는 이 파일에 넣지 않는다. 줄은 차례(index)와 줄 글의 지문(hash, src/lib/songs/line-hash.ts)으로,
// 낱말은 줄 안의 글자 위치(start, length)로 가리킨다. 화면에 보일 글은 합칠 때 DB의 가사 줄에서 잘라 만든다.
// 글자 위치는 코드포인트 단위다(UTF-16 단위가 아니다): Array.from(줄 글)의 차례. 0부터 센다.
// 이 파일만 서버(node) 전용이다(지문에 node:crypto). 클라이언트 컴포넌트는 타입만 가져간다.

/** 문법 메모가 가리킬 수 있는 교재. 화면 주소(/ilmuta/n, /ilmunta/n)와 같다 */
export const ANALYSIS_BOOKS = ["ilmuta", "ilmunta"] as const;
export type AnalysisBook = (typeof ANALYSIS_BOOKS)[number];

/** 한 줄의 낱말 조각 수 상한. 줄 글이 200자까지라 조각도 그 이상 나올 수 없다 */
export const MAX_TOKENS_PER_LINE = 200;
const MAX_LINE_CHARS = 200;

/**
 * 뜻을 붙일 낱말 하나. 줄 전체를 덮지 않아도 된다(덮지 않은 글자는 그냥 글로 보인다).
 * 모르는 필드는 받지 않는다(gloss를 meaning으로 잘못 쓰면 check가 알려 주게, surface 같은 가사 글자도).
 */
export const analysisTokenSchema = z.strictObject({
  /** 줄 안 시작 글자 위치(코드포인트, 0부터) */
  start: z
    .number()
    .int()
    .min(0)
    .max(MAX_LINE_CHARS - 1),
  /** 글자 수(코드포인트) */
  length: z.number().int().min(1).max(MAX_LINE_CHARS),
  /** 히라가나 읽는 법. 한자가 들어 있을 때만. 노래에서 특별하게 읽으면 그 읽기 */
  reading: z.string().min(1).max(60).optional(),
  /** 사전에서 찾을 기본형 한 낱말(겉모양과 다를 때만, 예: 降っていた → 降る) */
  base: z.string().min(1).max(30).optional(),
  /** 품사(名詞·動詞·助詞 …, 화면이 한국어로 바꿔 보인다) */
  pos: z.string().min(1).max(20).optional(),
  /** 이 노래에서의 한국어 뜻. 짧게 */
  gloss: z.string().min(1).max(80).optional(),
});
export type AnalysisToken = z.infer<typeof analysisTokenSchema>;

export const grammarNoteSchema = z.strictObject({
  /** 문형(예: 〜ても). 가사 줄을 통째로 쓰지 않는다 */
  pattern: z.string().min(1).max(30),
  /** 한국어 설명 */
  explain: z.string().min(1).max(500),
  /** 그 문형을 배우는 교재의 강 */
  ref: z
    .strictObject({
      book: z.enum(ANALYSIS_BOOKS),
      lesson: z.number().int().min(0).max(99),
    })
    .optional(),
});
export type GrammarNote = z.infer<typeof grammarNoteSchema>;

/** 조각은 앞에서부터 차례로, 서로 겹치지 않게(교재 예문 분석도 같은 규칙을 쓴다) */
export function refineTokenOrder(
  line: { tokens: readonly AnalysisToken[] },
  ctx: z.RefinementCtx,
) {
  let end = 0;
  line.tokens.forEach((t, i) => {
    if (t.start < end)
      ctx.addIssue({
        code: "custom",
        message: "조각이 앞 조각과 겹치거나 차례가 뒤바뀜",
        path: ["tokens", i, "start"],
      });
    end = Math.max(end, t.start + t.length);
  });
}

export const lineAnalysisSchema = z
  .strictObject({
    /** 가사 줄 차례(0부터) */
    index: z
      .number()
      .int()
      .min(0)
      .max(MAX_LINES - 1),
    /** 그 줄 글의 지문(`pnpm songs:pull`이 받은 가사 파일에 적혀 있다) */
    hash: z.string().regex(LINE_HASH_PATTERN),
    tokens: z.array(analysisTokenSchema).max(MAX_TOKENS_PER_LINE).default([]),
    grammar: z.array(grammarNoteSchema).max(10).optional(),
  })
  .superRefine(refineTokenOrder);
export type LineAnalysis = z.infer<typeof lineAnalysisSchema>;

export const songAnalysisSchema = z
  .strictObject({
    slug: z.string().regex(SLUG_PATTERN),
    /** 분석한 날(YYYY-MM-DD 또는 ISO 시각) */
    analyzedAt: z.union([z.iso.date(), z.iso.datetime({ offset: true })]),
    lines: z.array(lineAnalysisSchema).max(MAX_LINES),
  })
  .superRefine((analysis, ctx) => {
    const seen = new Set<number>();
    analysis.lines.forEach((line, i) => {
      if (seen.has(line.index))
        ctx.addIssue({
          code: "custom",
          message: "같은 차례(index)의 줄을 두 번 적음",
          path: ["lines", i, "index"],
        });
      seen.add(line.index);
    });
  });
export type SongAnalysis = z.infer<typeof songAnalysisSchema>;

/** 화면에 보일 조각: 글은 가사 줄에서 잘라 낸 것. plain이면 분석이 없는 글(누르지 않는다) */
export interface ShownToken {
  surface: string;
  reading?: string;
  base?: string;
  pos?: string;
  gloss?: string;
  plain?: true;
}

/** 화면에 보일 한 줄의 분석 */
export interface ShownAnalysis {
  tokens: ShownToken[];
  grammar: GrammarNote[];
}

/**
 * 줄 글을 조각 위치대로 잘라 화면 조각을 만든다. 조각 사이·앞뒤의 덮지 않은 글은 plain 조각으로 채운다.
 * 조각이 줄 범위를 넘으면 null(분석을 쓰지 않는다).
 */
export function cutTokens(
  ja: string,
  tokens: readonly AnalysisToken[],
): ShownToken[] | null {
  const chars = Array.from(ja);
  const out: ShownToken[] = [];
  let pos = 0;
  for (const { start, length, ...info } of tokens) {
    if (start < pos || start + length > chars.length) return null;
    if (start > pos)
      out.push({ surface: chars.slice(pos, start).join(""), plain: true });
    out.push({ surface: chars.slice(start, start + length).join(""), ...info });
    pos = start + length;
  }
  if (pos < chars.length)
    out.push({ surface: chars.slice(pos).join(""), plain: true });
  return out;
}

export interface MergedAnalysis {
  /** 분석 파일이 있는지 */
  analyzed: boolean;
  /** 가사 줄 차례마다 분석(맞는 분석이 없으면 null) */
  byLine: (ShownAnalysis | null)[];
  /** 분석 파일이 있는데 맞는 분석이 없는 줄 수(가사가 바뀌어 다시 분석해야 하는 줄) */
  staleCount: number;
}

/**
 * 가사 줄과 분석을 맞춘다. 같은 차례에 같은 지문이면 그 분석을 쓰고, 차례가 달라도 지문이 같은
 * 분석이 있으면 그것을 쓴다(후렴처럼 같은 글이 다시 나오거나, 앞에 줄이 들어가 밀린 줄).
 * 지문이 맞는 분석이 없거나 조각이 줄 범위를 넘으면 그 줄은 분석 없이 둔다.
 */
export function mergeAnalysis(
  lines: readonly Pick<SongLine, "ja">[],
  analysis: Pick<SongAnalysis, "lines"> | null,
): MergedAnalysis {
  if (!analysis)
    return { analyzed: false, byLine: lines.map(() => null), staleCount: 0 };
  const byIndex = new Map(analysis.lines.map((l) => [l.index, l]));
  const byHash = new Map<string, LineAnalysis>();
  for (const l of analysis.lines)
    if (!byHash.has(l.hash)) byHash.set(l.hash, l);

  const byLine = lines.map((line, i): ShownAnalysis | null => {
    const hash = lineHash(line.ja);
    const atIndex = byIndex.get(i);
    const found = atIndex?.hash === hash ? atIndex : byHash.get(hash);
    if (!found) return null;
    const tokens = cutTokens(line.ja, found.tokens);
    return tokens ? { tokens, grammar: found.grammar ?? [] } : null;
  });
  return {
    analyzed: true,
    byLine,
    staleCount: byLine.filter((l) => l === null).length,
  };
}
