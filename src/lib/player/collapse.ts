// 폰 강 화면 위에 붙은 재생기: 아래로 읽어 내려가면 한 줄로 접고, 위로 올리면 다시 편다.

/** 맨 위 근처에서는 언제나 편다 */
const TOP_ZONE_PX = 80;
/** 이만큼 넘게 움직였을 때만 방향을 본다(손가락 떨림에 접혔다 펴지지 않게) */
const STEP_PX = 12;

export interface CollapseState {
  collapsed: boolean;
  /** 방향을 마지막으로 정한 스크롤 위치 */
  anchorY: number;
}

export function nextCollapse(s: CollapseState, y: number): CollapseState {
  if (y < TOP_ZONE_PX) return { collapsed: false, anchorY: y };
  const moved = y - s.anchorY;
  if (moved > STEP_PX) return { collapsed: true, anchorY: y };
  if (moved < -STEP_PX) return { collapsed: false, anchorY: y };
  return s;
}
