/** 재생 막대 위로 남길 틈(px) */
export const BAR_GAP = 16;
/** 막대가 없을 때 화면 아래로 남길 틈(px) */
export const EDGE_GAP = 24;
/** 칸이 너무 작아지지 않게 하는 아래 한계(px) */
export const MIN_HEIGHT = 160;

/**
 * 따라오는 곁칸의 최대 높이. 칸 끝이 막대(없으면 화면 끝) 위에 오도록
 * 지금 칸 위쪽(붙기 전이면 머리글 아래, 붙은 뒤면 stickyTop)에서 잰다.
 */
export function stickyMaxHeight({
  viewport,
  panelTop,
  stickyTop,
  barTop,
}: {
  viewport: number;
  panelTop: number;
  stickyTop: number;
  /** 보이는 재생 막대의 위쪽(없으면 null) */
  barTop: number | null;
}): number {
  const bottom = barTop === null ? viewport - EDGE_GAP : barTop - BAR_GAP;
  const top = Math.max(panelTop, stickyTop);
  return Math.max(MIN_HEIGHT, Math.round(bottom - top));
}
