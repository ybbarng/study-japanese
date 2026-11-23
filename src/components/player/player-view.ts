import type { Track } from "@/lib/player/queue";

/** GlobalPlayer가 재생 화면(막대·펼친 화면)에 넘기는 것 */
export interface PlayerViewProps {
  track: Track;
  index: number;
  queueLength: number;
  paused: boolean;
  pos: number;
  duration: number;
  /** 따라 말하기 간격 중이면 전체 길이(초) */
  gap: number | null;
  onToggle: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (t: number) => void;
  onSeekBy: (delta: number) => void;
}
