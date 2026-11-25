import { describe, expect, it } from "vitest";
import hira from "@/lib/writing/data/kanjivg-hiragana.json";
import kata from "@/lib/writing/data/kanjivg-katakana.json";
import { type StrokeFile, tableFromFiles } from "@/lib/writing/types";
import { ALL_CARD_IDS, cardChar } from "./data";
import { strokeCounts } from "./strokes";

const table = tableFromFiles([hira as StrokeFile, kata as StrokeFile]);

describe("가나 획 수(KanjiVG 데이터에서)", () => {
  it("교과서 획 수를 첫 값으로 준다", () => {
    expect(strokeCounts("あ", table)).toEqual([3]);
    expect(strokeCounts("ネ", table)).toEqual([4]);
  });

  it("손으로 쓸 때 갈리는 글자는 두 획 수를 다 받는다", () => {
    expect(strokeCounts("き", table)).toEqual([4, 3]);
    expect(strokeCounts("さ", table)).toEqual([3, 2]);
    expect(strokeCounts("そ", table)).toEqual([1, 2]);
    expect(strokeCounts("り", table)).toEqual([2, 1]);
  });

  it("탁점 글자는 바탕 글자의 다른 꼴도 받는다", () => {
    expect(strokeCounts("が", table)).toEqual([5]);
    expect(strokeCounts("ぱ", table)).toEqual([4]);
    expect(strokeCounts("ぎ", table)).toEqual([6, 5]);
    expect(strokeCounts("ぞ", table)).toEqual([3, 4]);
  });

  it("요음은 두 글자 획 수를 더한다", () => {
    expect(strokeCounts("きゃ", table)).toEqual([7, 6]);
    expect(strokeCounts("ショ", table)).toEqual([6]);
  });

  it("데이터에 없는 글자가 섞이면 빈 배열", () => {
    expect(strokeCounts("日", table)).toEqual([]);
  });

  it("사이트의 모든 가나 카드 글자에 획 데이터가 있다", () => {
    const missing = ALL_CARD_IDS.map(cardChar).filter(
      (t) => strokeCounts(t, table).length === 0,
    );
    expect(missing).toEqual([]);
  });
});
