import type { StrokeTable } from "./types";

/**
 * 손으로 쓸 때 데이터와 다른 획 수로도 쓰는 글자의 예외 표. 글자 → 함께 받을 획 수.
 * 데이터의 획 수가 언제나 첫 값(교과서 획 수)이고, 예외는 그 뒤에 붙는다.
 */
export type AlternateCounts = Readonly<Record<string, readonly number[]>>;

/** 글자 하나의 획 수 후보. 데이터에 없으면 빈 배열 */
function countsOfChar(
  ch: string,
  table: StrokeTable,
  alternates: AlternateCounts,
): number[] {
  const data = table.get(ch);
  if (!data) return [];
  const n = data.strokes.length;
  const own = alternates[ch];
  if (own) return [n, ...own];
  // 탁점·반탁점 글자(ぎ)는 바탕 글자(き)의 예외를 그만큼 옮겨 받는다
  const base = [...ch.normalize("NFD")][0];
  const baseData = base !== ch ? table.get(base) : undefined;
  const baseAlt = alternates[base];
  if (baseData && baseAlt)
    return [n, ...baseAlt.map((a) => n - baseData.strokes.length + a)];
  return [n];
}

/**
 * 글(글자 하나나 요음처럼 둘)을 쓰는 데 드는 획 수 후보. 첫 값이 데이터(교과서) 획 수다.
 * 데이터가 없는 글자가 섞이면 빈 배열(그때는 획 수를 따지지 않는다).
 */
export function acceptedStrokeCounts(
  text: string,
  table: StrokeTable,
  alternates: AlternateCounts = {},
): number[] {
  let sums = [0];
  for (const ch of text) {
    const counts = countsOfChar(ch, table, alternates);
    if (counts.length === 0) return [];
    sums = sums.flatMap((s) => counts.map((c) => s + c));
  }
  return [...new Set(sums)];
}
