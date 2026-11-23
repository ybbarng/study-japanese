import { cutTokens, mergeAnalysis, songAnalysisSchema } from "./analysis";
import { lineHash } from "./line-hash";
import type { SongLine } from "./schema";

// `pnpm songs:check <slug>`의 판정(scripts/songs/check.ts가 파일을 읽어 넘긴다).
// 결과에는 가사 글을 싣지 않고 줄 차례(index, 0부터)만 싣는다.

export interface CheckResult {
  ok: boolean;
  /** 스키마 오류: "lines.3.tokens.0.start: …" 모양 */
  schemaErrors: string[];
  /** 분석 파일의 slug가 받은 가사와 다름 */
  slugMismatch: boolean;
  /** 맞는 분석이 없는 가사 줄 차례 */
  missingLines: number[];
  /** 적은 지문이 그 차례 가사 줄의 지문과 다른 분석 줄의 차례(가사가 바뀌었거나 차례를 잘못 적음) */
  hashMismatches: number[];
  /** 조각 위치가 줄 글자 수를 넘는 분석 줄의 차례 */
  rangeErrors: number[];
}

export function checkAnalysis(
  raw: unknown,
  lyrics: { slug: string; lines: readonly Pick<SongLine, "ja">[] },
): CheckResult {
  const empty = {
    slugMismatch: false,
    missingLines: [],
    hashMismatches: [],
    rangeErrors: [],
  };
  const parsed = songAnalysisSchema.safeParse(raw);
  if (!parsed.success)
    return {
      ok: false,
      schemaErrors: parsed.error.issues.map(
        (issue) => `${issue.path.join(".") || "(맨 위)"}: ${issue.message}`,
      ),
      ...empty,
    };
  const analysis = parsed.data;
  const hashes = lyrics.lines.map((l) => lineHash(l.ja));
  const hashMismatches: number[] = [];
  const rangeErrors: number[] = [];
  for (const line of analysis.lines) {
    if (hashes[line.index] !== line.hash) {
      hashMismatches.push(line.index);
      continue;
    }
    if (!cutTokens(lyrics.lines[line.index].ja, line.tokens))
      rangeErrors.push(line.index);
  }
  const merged = mergeAnalysis(lyrics.lines, analysis);
  const missingLines = merged.byLine.flatMap((l, i) => (l ? [] : [i]));
  const slugMismatch = analysis.slug !== lyrics.slug;
  return {
    ok:
      !slugMismatch &&
      missingLines.length === 0 &&
      hashMismatches.length === 0 &&
      rangeErrors.length === 0,
    schemaErrors: [],
    slugMismatch,
    missingLines,
    hashMismatches,
    rangeErrors,
  };
}

const list = (xs: number[]) => xs.join(", ");

/** 사람이 읽을 보고 줄들 */
export function formatCheck(result: CheckResult): string[] {
  if (result.schemaErrors.length > 0)
    return [
      `분석 파일 모양이 맞지 않음(${result.schemaErrors.length}건):`,
      ...result.schemaErrors.map((e) => `  ${e}`),
    ];
  const out: string[] = [];
  if (result.slugMismatch) out.push("분석 파일의 slug가 노래 주소와 다름");
  if (result.hashMismatches.length > 0)
    out.push(
      `지문이 그 차례 가사 줄과 다름(가사가 바뀌었거나 index를 잘못 적음): index ${list(result.hashMismatches)}`,
    );
  if (result.rangeErrors.length > 0)
    out.push(
      `조각 위치가 줄 글자 수(코드포인트)를 넘음: index ${list(result.rangeErrors)}`,
    );
  if (result.missingLines.length > 0)
    out.push(
      `분석이 없는 가사 줄 ${result.missingLines.length}개: index ${list(result.missingLines)}`,
    );
  if (result.ok) out.push("맞음: 모든 가사 줄에 분석이 있다");
  return out;
}
