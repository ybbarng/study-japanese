/** whisper-cli `-ojf` JSON에서 쓰는 것만 뽑는다. */

type WhisperToken = { text: string; p: number };
type WhisperSegment = {
  offsets: { from: number; to: number };
  text: string;
  tokens?: WhisperToken[];
};
export type WhisperJson = {
  result?: { language?: string };
  transcription?: WhisperSegment[];
};

/** 조각 하나의 전사 결과. 시각은 조각 처음부터 센 초 */
export type ChunkResult = {
  /** whisper가 감지했거나 지정받은 언어(`ko`, `ja`, `en` …) */
  lang: string;
  segments: { start: number; end: number; text: string }[];
  /** 특수 토큰을 뺀 토큰 확률의 로그 평균. 토큰이 없으면 NO_TOKENS(JSON에 남도록 유한한 값) */
  meanLogProb: number;
};

export const NO_TOKENS = -99;

const SPECIAL = /^\[_?[A-Z_0-9]+\]?$|^\[_/;

export function parseWhisperJson(json: WhisperJson): ChunkResult {
  const segs = json.transcription ?? [];
  let sum = 0;
  let n = 0;
  for (const s of segs) {
    for (const t of s.tokens ?? []) {
      if (SPECIAL.test(t.text)) continue;
      sum += Math.log(Math.max(t.p, 1e-6));
      n++;
    }
  }
  return {
    lang: json.result?.language ?? "",
    segments: segs
      .map((s) => ({
        start: s.offsets.from / 1000,
        end: s.offsets.to / 1000,
        text: s.text.trim(),
      }))
      .filter((s) => s.text.length > 0),
    meanLogProb: n === 0 ? NO_TOKENS : sum / n,
  };
}

export function chunkText(r: ChunkResult): string {
  return r.segments.map((s) => s.text).join(" ");
}
