import { boundsOf, fitTo, lengthOf, meanDistance, resample } from "./geometry";
import type { Pt } from "./types";

/**
 * 손으로 그은 획을 본보기 획과 견준다. 두 선을 길이가 고르게 같은 수의 점으로 다시 찍고,
 * 차례가 같은 점끼리의 평균 거리(쓰기 칸 한 변에 대한 몫)를 본다.
 *   - 본보기 획을 그대로 따라 그었으면 거리가 작다.
 *   - 같은 자리를 거꾸로(끝에서 시작으로) 그었으면, 뒤집은 본보기와의 거리가 훨씬 작다 → 방향 틀림.
 *   - 다른 차례의 본보기 획과 훨씬 가까우면 → 순서 틀림.
 * 손가락으로 쓴 글씨가 떨어지지 않게 거리 허용을 넉넉히 두고, "훨씬"(clearly)일 때만 틀렸다고 한다.
 */
export const STROKE_RULES = {
  /** 다시 찍는 점 수 */
  samples: 16,
  /** 본보기 위에 따라 쓸 때 같은 획으로 볼 평균 거리(칸 한 변에 대한 몫) */
  near: 0.16,
  /** 본보기 없이 쓸 때(자리가 흔들린다) */
  nearFree: 0.24,
  /** 다른 쪽(거꾸로·다른 획)이 이만큼보다 가까워야 틀렸다고 한다 */
  clearly: 0.75,
  /** 이보다 짧은 획(탁점·반탁점 동그라미 등)은 방향을 보지 않는다(칸 한 변에 대한 몫) */
  tiny: 0.1,
};

export type StrokeVerdict =
  | { kind: "ok" }
  /** 같은 자리를 거꾸로 그었다 */
  | { kind: "reversed" }
  /** 본보기의 다른 획(`matches`번째, 0부터)을 그었다 */
  | { kind: "order"; matches: number }
  /** 어느 본보기 획과도 맞지 않는다(자리·모양이 다르다) */
  | { kind: "off" };

const reverse = (s: readonly Pt[]) => [...s].reverse();

/**
 * 그은 획 하나를 본보기 획 목록의 `index`번째와 견준다. 좌표는 둘 다 같은 칸 좌표이고
 * `size`는 칸 한 변이다.
 */
export function judgeStroke(
  drawn: readonly Pt[],
  expected: readonly (readonly Pt[])[],
  index: number,
  size: number,
  near = STROKE_RULES.near,
  rules = STROKE_RULES,
): StrokeVerdict {
  const n = rules.samples;
  const mine = resample(drawn, n);
  const dist = (s: readonly Pt[]) => meanDistance(mine, resample(s, n)) / size;
  const target = expected[index];
  if (!target) return { kind: "off" };
  const fwd = dist(target);
  const rev = dist(reverse(target));
  const tiny = lengthOf(target) / size < rules.tiny;
  const here = tiny ? Math.min(fwd, rev) : fwd;

  // 다른 차례의 획에 훨씬 가까우면 순서가 틀렸다
  let best = -1;
  let bestD = Infinity;
  for (const [j, s] of expected.entries()) {
    if (j === index) continue;
    const d = dist(s);
    if (d < bestD) {
      bestD = d;
      best = j;
    }
  }
  if (best >= 0 && bestD <= near && bestD < Math.min(fwd, rev) * rules.clearly)
    return { kind: "order", matches: best };

  if (!tiny && rev <= near && rev < fwd * rules.clearly)
    return { kind: "reversed" };
  if (here <= near) return { kind: "ok" };
  return { kind: "off" };
}

export interface StrokeIssue {
  /** 몇 번째로 그은 획인지(0부터) */
  index: number;
  verdict: Exclude<StrokeVerdict, { kind: "ok" }>;
}

/**
 * 다 쓴 글자의 획을 차례대로 본보기와 견준다. 그은 획 수가 본보기와 다르면(き를 3획으로 쓰는 등
 * 다른 꼴) 획끼리 짝지을 수 없어 빈 배열을 준다. 자리·크기가 조금 달라도 되게, 그은 획 전체를
 * 본보기 상자에 맞춘 뒤 견준다. 자리·모양만 다른 획(off)은 겹침 채점에 맡기고 여기서는 빼서,
 * 순서·방향이 다른 획만 돌려준다.
 */
export function judgeStrokes(
  drawn: readonly (readonly Pt[])[],
  expected: readonly (readonly Pt[])[],
  size: number,
  rules = STROKE_RULES,
): StrokeIssue[] {
  if (drawn.length !== expected.length || drawn.length === 0) return [];
  const fitted = fitTo(drawn, boundsOf(expected));
  const issues: StrokeIssue[] = [];
  for (const [i, s] of fitted.entries()) {
    const v = judgeStroke(s, expected, i, size, rules.nearFree, rules);
    if (v.kind === "reversed" || v.kind === "order")
      issues.push({ index: i, verdict: v });
  }
  return issues;
}

/** 학습자에게 보일 말 */
export function issueText(issue: StrokeIssue): string {
  const n = issue.index + 1;
  if (issue.verdict.kind === "reversed")
    return `${n}번째 획의 방향이 거꾸로예요. 본보기의 시작점에서 그어요.`;
  if (issue.verdict.kind === "order")
    return `${n}번째로 그은 획은 본보기의 ${issue.verdict.matches + 1}번째 획이에요. 획순을 확인해요.`;
  return `${n}번째 획의 자리나 모양이 본보기와 달라요.`;
}
