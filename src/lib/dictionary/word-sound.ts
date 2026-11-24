// 사전 낱말 페이지의 "낱말 듣기"가 낼 소리를 고른다.
// 교재 사람 목소리(예문 mp3의 한 구간)를 기계 음성보다 먼저 쓴다:
// ① 그 낱말만 읽는 단어 카드 구간 ② 그 낱말이 든 문장 가운데 가장 짧은 것의 구간.
// 구간을 찾은 예문이 없으면 null(화면이 기기 음성 합성으로 읽는다).

export interface SoundCandidate {
  /** 단어 익히기 카드(낱말 자체를 읽는 구간)인지 */
  wordCard: boolean;
  /** 예문 글 길이(짧을수록 그 낱말이 또렷하다) */
  length: number;
  cue: { start: number; end: number } | null;
}

export function pickWordClip<T extends SoundCandidate>(
  examples: readonly T[],
): T | null {
  const withCue = examples.filter((e) => e.cue !== null);
  if (withCue.length === 0) return null;
  return [...withCue].sort(
    (a, b) => Number(b.wordCard) - Number(a.wordCard) || a.length - b.length,
  )[0];
}
