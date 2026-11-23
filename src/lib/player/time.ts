/** 재생 위치 표기 m:ss. 길이를 모르면 --:-- */
export function clock(sec: number): string {
  if (!Number.isFinite(sec)) return "--:--";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** 지금 트랙에서 얼마나 왔는지(0~1). 따라 말하기 간격 중이면 간격 안에서 */
export function progressOf(pos: number, duration: number, gap: number | null) {
  if (gap) return Math.min(1, pos / gap);
  return Number.isFinite(duration) && duration > 0
    ? Math.min(1, pos / duration)
    : 0;
}
