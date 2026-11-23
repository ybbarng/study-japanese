import type { ListenEvent } from "@/lib/store/listen";

export interface Track {
  /** 기록용 식별자: 책과 항목 */
  book: ListenEvent["book"];
  item: string;
  kind: ListenEvent["kind"];
  src: string;
  title: string;
  subtitle?: string;
  /** 예문 글(있으면 재생 화면에 크게) */
  lines?: { ja: string; ko?: string }[];
}

export type RepeatMode = "off" | "one" | "all";

/** 트랙이 끝난 뒤 갈 곳. null이면 멈춘다. */
export function nextIndex(
  index: number,
  length: number,
  repeat: RepeatMode,
): number | null {
  if (length === 0) return null;
  if (repeat === "one") return index;
  if (index + 1 < length) return index + 1;
  return repeat === "all" ? 0 : null;
}

/** 이전 버튼: 3초 넘게 들었으면 처음부터, 아니면 앞 트랙. */
export function prevAction(
  index: number,
  currentTime: number,
): { restart: true } | { index: number } {
  if (currentTime > 3 || index === 0) return { restart: true };
  return { index: index - 1 };
}

/** 따라 말하기 간격: 예문 길이만큼 + 여유 0.8초, 최소 2초·최대 20초. 강의에는 두지 않는다. */
export function shadowGapSec(
  track: Track,
  durationSec: number,
  enabled: boolean,
): number {
  if (!enabled || track.kind !== "example" || !Number.isFinite(durationSec))
    return 0;
  return Math.min(20, Math.max(2, durationSec + 0.8));
}
