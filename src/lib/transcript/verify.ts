import {
  hasRunawayRepeat,
  isKnownHallucination,
  longestSameRun,
} from "./hallucination";
import { type Transcript, transcriptSchema } from "./schema";

/** 같은 구간이 이만큼 잇달아 나오면 환각으로 본다 */
export const SAME_RUN_LIMIT = 8;

export type TranscriptCheck = {
  /** 모양이 스키마에 맞는가 */
  schemaOk: boolean;
  /** 문제 설명(사람이 읽는 한 줄씩) */
  problems: string[];
  /** 구간이 하나도 없다 */
  empty: boolean;
  /** 같은 구간이 SAME_RUN_LIMIT번 넘게 잇달아 나오거나, 되풀이·정해진 환각 문구가 든 구간이 있다 */
  hallucination: boolean;
  segments: number;
  ja: number;
  ko: number;
};

export function checkTranscript(data: unknown): TranscriptCheck {
  const parsed = transcriptSchema.safeParse(data);
  if (!parsed.success) {
    return {
      schemaOk: false,
      problems: parsed.error.issues.map(
        (i) => `모양: ${i.path.join(".")} ${i.message}`,
      ),
      empty: false,
      hallucination: false,
      segments: 0,
      ja: 0,
      ko: 0,
    };
  }
  const t: Transcript = parsed.data;
  const problems: string[] = [];
  let prev = -1;
  let prevEnd = -1;
  for (const [i, s] of t.segments.entries()) {
    if (s.start < prev)
      problems.push(
        `시각: ${i}번째 구간 시작(${s.start})이 앞 구간 시작보다 이르다`,
      );
    if (s.start < prevEnd)
      problems.push(
        `시각: ${i}번째 구간이 앞 구간과 겹친다(${s.start} < ${prevEnd})`,
      );
    if (s.end > t.durationSec + 0.01)
      problems.push(`시각: ${i}번째 구간 끝(${s.end})이 파일 길이를 넘는다`);
    prev = s.start;
    prevEnd = s.end;
  }
  const texts = t.segments.map((s) => s.text);
  const run = longestSameRun(texts);
  const repeats = texts.filter(hasRunawayRepeat).length;
  const known = texts.filter(isKnownHallucination).length;
  const hallucination = run.count > SAME_RUN_LIMIT || repeats > 0 || known > 0;
  if (run.count > SAME_RUN_LIMIT)
    problems.push(`환각: 같은 구간이 ${run.count}번 잇달아 나온다`);
  if (repeats > 0) problems.push(`환각: 구간 안 되풀이 ${repeats}개`);
  if (known > 0) problems.push(`환각: 정해진 환각 문구 ${known}개`);
  const empty = t.segments.length === 0;
  if (empty) problems.push("비어 있다: 구간이 없다");
  return {
    schemaOk: true,
    problems,
    empty,
    hallucination,
    segments: t.segments.length,
    ja: t.segments.filter((s) => s.lang === "ja").length,
    ko: t.segments.filter((s) => s.lang === "ko").length,
  };
}
