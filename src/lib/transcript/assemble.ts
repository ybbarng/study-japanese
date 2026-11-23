import { type Picked, pickChunk } from "./choose";
import { isSuspectText } from "./hallucination";
import type { Span } from "./regions";
import type { Transcript, TranscriptSegment } from "./schema";
import type { ChunkResult } from "./whisper-json";

/**
 * 파일 하나의 whisper 원 결과. 고르기 규칙을 고쳐도 whisper를 다시 돌리지 않고
 * `buildTranscript`로 자막을 다시 만들 수 있게 저장소 밖 캐시에 남긴다.
 */
export type RawTranscription = {
  durationSec: number;
  spans: Span[];
  /** 조각마다 언어 감지(`-l auto`) 결과 */
  auto: ChunkResult[];
  /** 다시 전사한 조각만, 조각 번호 → 결과 */
  ko: Record<number, ChunkResult>;
  ja: Record<number, ChunkResult>;
};

export function buildTranscript(
  meta: Pick<Transcript, "book" | "item" | "kind">,
  raw: RawTranscription,
): Transcript {
  const segments = assembleSegments(
    raw.spans.map((span, i) => ({
      span,
      picked: pickChunk(raw.auto[i], { ko: raw.ko[i], ja: raw.ja[i] }),
    })),
  ).filter((s) => s.start < raw.durationSec);
  return { ...meta, durationSec: roundSec(raw.durationSec), segments };
}

/** 초를 소수 둘째 자리로 */
export function roundSec(t: number): number {
  return Math.round(t * 100) / 100;
}

/**
 * 조각마다 고른 결과를 파일 처음부터 센 시각의 구간 목록으로 모은다.
 * - 조각 안 시각에 조각 시작을 더하고 조각 범위 안으로 자른다
 * - 지어낸 것으로 보이는 구간과 빈 구간은 버린다
 * - 시작 시각이 줄지 않게, 앞 구간 끝이 뒤 구간 시작을 넘지 않게 맞춘다
 */
export function assembleSegments(
  chunks: { span: Span; picked: Picked | undefined }[],
): TranscriptSegment[] {
  const raw: TranscriptSegment[] = [];
  const ordered = [...chunks].sort((a, b) => a.span.start - b.span.start);
  for (const { span, picked } of ordered) {
    if (!picked) continue;
    const segs = picked.result.segments;
    for (const [i, s] of segs.entries()) {
      const text = s.text.replace(/\s+/g, " ").trim();
      if (text.length === 0 || isSuspectText(text)) continue;
      const start = Math.min(span.end, span.start + Math.max(0, s.start));
      // 마지막 구간은 조각 끝까지 늘려 말끝이 잘리지 않게 한다
      const rawEnd = i === segs.length - 1 ? span.end : span.start + s.end;
      const end = Math.max(start, Math.min(span.end, rawEnd));
      raw.push({ start, end, text, lang: picked.lang });
    }
  }
  const out: TranscriptSegment[] = [];
  for (const s of raw) {
    const prev = out.at(-1);
    const start = roundSec(prev ? Math.max(s.start, prev.start) : s.start);
    if (prev && prev.end > start) prev.end = start;
    out.push({ ...s, start, end: roundSec(Math.max(start, s.end)) });
  }
  return out;
}
