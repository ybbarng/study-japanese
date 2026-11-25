import {
  type AlternateCounts,
  acceptedStrokeCounts,
} from "@/lib/writing/counts";
import type { StrokeTable } from "@/lib/writing/types";

/**
 * 가나 획 수. 획 수는 KanjiVG 획 데이터(src/lib/writing/data)에서 구한다.
 * 손으로 쓸 때 획 수가 둘로 갈리는 글자는 아래 예외 표로 다른 꼴도 받는다
 * (き 4·3, さ 3·2, そ 1·2, り 2·1). 탁점·반탁점 글자(ぎ 등)는 바탕 글자의 예외를 따른다.
 */
export const KANA_ALTERNATE_STROKES: AlternateCounts = {
  き: [3],
  さ: [2],
  そ: [2],
  り: [1],
};

/**
 * 글자(요음처럼 두 글자일 수도 있다)를 쓰는 데 드는 획 수 후보. 첫 값이 교과서 획 수다.
 * 데이터가 없는 글자가 섞여 있으면 빈 배열(그때는 획 수를 따지지 않는다).
 */
export function strokeCounts(text: string, table: StrokeTable): number[] {
  return acceptedStrokeCounts(text, table, KANA_ALTERNATE_STROKES);
}
