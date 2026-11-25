import { describe, expect, it } from "vitest";
import { CELL, layoutText, strokeStart } from "./layout";
import type { StrokeTable } from "./types";

// 모양만 같은 가짜 획 데이터(한 칸 한 변 100)
const table: StrokeTable = new Map([
  ["か", { viewBox: 100, strokes: ["M10,20c5,0,10,0,20,0", "M50,10l0,80"] }],
  ["ゃ", { viewBox: 100, strokes: ["m30 40 l20 0"] }],
]);

describe("쓰기 칸에 획 늘어놓기", () => {
  it("글자 하나는 한 칸을 채우고 데이터 크기를 칸 크기로 맞춘다", () => {
    const l = layoutText("か", table);
    expect(l?.size).toBe(CELL);
    expect(l?.strokes.map((s) => s.scale)).toEqual([1.09, 1.09]);
    expect(strokeStart(l?.strokes[1] ?? never())).toEqual({
      x: 50 * 1.09,
      y: 10 * 1.09,
    });
  });

  it("요음은 두 글자를 가로로 놓고 칸 높이 가운데에 둔다", () => {
    const l = layoutText("かゃ", table);
    expect(l?.size).toBe(CELL * 2);
    expect(l?.strokes.map((s) => [s.charIndex, s.dx, s.dy])).toEqual([
      [0, 0, CELL / 2],
      [0, 0, CELL / 2],
      [1, CELL, CELL / 2],
    ]);
    // 소문자 m으로 시작해도 시작점을 읽는다
    expect(strokeStart(l?.strokes[2] ?? never())).toEqual({
      x: CELL + 30 * 1.09,
      y: CELL / 2 + 40 * 1.09,
    });
  });

  it("데이터 없는 글자가 섞이면 놓지 않는다", () => {
    expect(layoutText("か日", table)).toBeNull();
  });
});

function never(): never {
  throw new Error("배치가 없음");
}
