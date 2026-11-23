import type { ListenCount } from "./progress";

/** 오디오 길이를 대충: 1분 안쪽은 초, 넘으면 분 */
export function roughDuration(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}초`;
  return `${Math.round(sec / 60)}분`;
}

export function listenText(count?: ListenCount): string {
  if (!count || count.plays === 0) return "아직 안 들음";
  return count.completedPlays > 0
    ? `${count.plays}번 들음 · 끝까지 ${count.completedPlays}번`
    : `${count.plays}번 들음`;
}
