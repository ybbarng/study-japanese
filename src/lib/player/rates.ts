// 재생 속도 단계. 재생 화면 단추와 [ ] 단축키가 함께 쓴다.

export const RATES = [0.75, 0.9, 1, 1.15, 1.3] as const;

/** 한 단계 느리게(-1)·빠르게(+1). 끝에서는 그대로, 목록에 없는 값이면 가장 가까운 단계에서 움직인다 */
export function stepRate(rate: number, dir: -1 | 1): number {
  let at = 0;
  for (let i = 1; i < RATES.length; i++)
    if (Math.abs(RATES[i] - rate) < Math.abs(RATES[at] - rate)) at = i;
  const next = Math.min(RATES.length - 1, Math.max(0, at + dir));
  return RATES[next];
}
