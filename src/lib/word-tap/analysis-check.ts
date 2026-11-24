import { cutTokens } from "@/lib/songs/analysis";
import { lineHash } from "@/lib/songs/line-hash";
import {
  mergeTextbookAnalysis,
  refKey,
  type SentenceRef,
  textbookAnalysisSchema,
} from "./analysis";

// `pnpm textbook:analysis-check`의 판정(scripts/textbook/analysis-check.ts가 파일을 읽어 넘긴다).
// 결과에는 교재 글을 싣지 않고 문장 자리(예문 id#차례)만 싣는다.

export interface TextbookCheckResult {
  ok: boolean;
  schemaErrors: string[];
  /** 파일의 book·lesson이 확인하려는 강과 다름 */
  lessonMismatch: boolean;
  /** 이 강에 없는 문장 자리 */
  unknownRefs: string[];
  /** 지문이 그 자리 문장과 다름(교재 글이 바뀌었거나 자리를 잘못 적음) */
  hashMismatches: string[];
  /** 조각 위치가 문장 글자 수를 넘음 */
  rangeErrors: string[];
  /** 맞는 분석이 없는 문장 */
  missing: string[];
}

export function checkTextbookAnalysis(
  raw: unknown,
  target: { book: string; lesson: number; sentences: readonly SentenceRef[] },
): TextbookCheckResult {
  const empty = {
    lessonMismatch: false,
    unknownRefs: [],
    hashMismatches: [],
    rangeErrors: [],
    missing: [],
  };
  const parsed = textbookAnalysisSchema.safeParse(raw);
  if (!parsed.success)
    return {
      ok: false,
      schemaErrors: parsed.error.issues.map(
        (issue) => `${issue.path.join(".") || "(맨 위)"}: ${issue.message}`,
      ),
      ...empty,
    };
  const analysis = parsed.data;
  const byRef = new Map(target.sentences.map((s) => [refKey(s), s]));
  const unknownRefs: string[] = [];
  const hashMismatches: string[] = [];
  const rangeErrors: string[] = [];
  for (const s of analysis.sentences) {
    const key = refKey(s);
    const sentence = byRef.get(key);
    if (!sentence) unknownRefs.push(key);
    else if (lineHash(sentence.ja) !== s.hash) hashMismatches.push(key);
    else if (!cutTokens(sentence.ja, s.tokens)) rangeErrors.push(key);
  }
  const missing = mergeTextbookAnalysis(target.sentences, analysis).missing.map(
    refKey,
  );
  const lessonMismatch =
    analysis.book !== target.book || analysis.lesson !== target.lesson;
  return {
    ok:
      !lessonMismatch &&
      unknownRefs.length === 0 &&
      hashMismatches.length === 0 &&
      rangeErrors.length === 0 &&
      missing.length === 0,
    schemaErrors: [],
    lessonMismatch,
    unknownRefs,
    hashMismatches,
    rangeErrors,
    missing,
  };
}

const list = (xs: string[]) => xs.join(", ");

/** 사람이 읽을 보고 줄들 */
export function formatTextbookCheck(result: TextbookCheckResult): string[] {
  if (result.schemaErrors.length > 0)
    return [
      `분석 파일 모양이 맞지 않음(${result.schemaErrors.length}건):`,
      ...result.schemaErrors.map((e) => `  ${e}`),
    ];
  const out: string[] = [];
  if (result.lessonMismatch) out.push("분석 파일의 book·lesson이 이 강과 다름");
  if (result.unknownRefs.length > 0)
    out.push(`이 강에 없는 문장 자리: ${list(result.unknownRefs)}`);
  if (result.hashMismatches.length > 0)
    out.push(
      `지문이 그 자리 문장과 다름(교재 글이 바뀌었거나 자리를 잘못 적음): ${list(result.hashMismatches)}`,
    );
  if (result.rangeErrors.length > 0)
    out.push(
      `조각 위치가 문장 글자 수(코드포인트)를 넘음: ${list(result.rangeErrors)}`,
    );
  if (result.missing.length > 0)
    out.push(
      `분석이 없는 문장 ${result.missing.length}개: ${list(result.missing)}`,
    );
  if (result.ok) out.push("맞음: 이 강의 모든 예문에 분석이 있다");
  return out;
}
