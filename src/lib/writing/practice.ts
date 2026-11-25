import type { WritingSet } from "./sets";
import type { StrokeVerdict } from "./stroke-check";

/**
 * 써 보기 단계.
 *   1 따라 쓰기: 본보기 위에 다음 획을 진하게, 시작점·방향 화살표
 *   2 흐린 본보기: 본보기만 흐리게
 *   3 혼자 쓰기: 빈 칸(보조선만)
 */
export type PracticeStage = 1 | 2 | 3;

export const STAGES: { stage: PracticeStage; label: string }[] = [
  { stage: 1, label: "따라 쓰기" },
  { stage: 2, label: "흐린 본보기" },
  { stage: 3, label: "혼자 쓰기" },
];

/** 획 하나를 그은 뒤 보일 말. `index`는 지금 써야 했던 획(0부터) */
export function strokeFeedback(
  verdict: StrokeVerdict,
  index: number,
  total: number,
): { ok: boolean; text: string } {
  const n = index + 1;
  switch (verdict.kind) {
    case "ok":
      return {
        ok: true,
        text: n === total ? "다 썼어요!" : `좋아요 · ${n}/${total}획`,
      };
    case "reversed":
      return {
        ok: false,
        text: `${n}번째 획의 방향이 거꾸로예요. 시작점(●)에서 화살표 쪽으로 그어요.`,
      };
    case "order":
      return {
        ok: false,
        text: `그건 ${verdict.matches + 1}번째 획이에요. 지금은 ${n}번째 획을 써요.`,
      };
    default:
      return {
        ok: false,
        text: `${n}번째 획의 자리나 모양이 달라요. 그 획만 다시 그어요.`,
      };
  }
}

export interface Position {
  rowId: string;
  index: number;
}

/** 다음 글자. 행이 끝나면 다음 행의 첫 글자, 마지막 행이 끝나면 첫 행으로 */
export function nextPosition(set: WritingSet, at: Position): Position {
  const r = set.rows.findIndex((x) => x.id === at.rowId);
  const row = set.rows[r];
  if (row && at.index + 1 < row.items.length)
    return { rowId: row.id, index: at.index + 1 };
  const next = set.rows[(r + 1) % set.rows.length];
  return { rowId: next.id, index: 0 };
}

/** 글자로 자리 찾기(없으면 첫 행 첫 글자) */
export function positionOf(set: WritingSet, text: string | null): Position {
  for (const row of set.rows) {
    const i = row.items.findIndex((it) => it.text === text);
    if (i >= 0) return { rowId: row.id, index: i };
  }
  return { rowId: set.rows[0].id, index: 0 };
}
