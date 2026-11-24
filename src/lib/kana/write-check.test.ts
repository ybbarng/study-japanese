import { describe, expect, it } from "vitest";
import { checkWriting, type Grid } from "./write-check";

const SIZE = 40;

/** 선분들을 굵기 2칸으로 칠한 격자(0~1 좌표) */
function draw(lines: [number, number, number, number][]): Grid {
  const cells = new Uint8Array(SIZE * SIZE);
  for (const [x1, y1, x2, y2] of lines) {
    for (let t = 0; t <= 1; t += 0.005) {
      const x = Math.round((x1 + (x2 - x1) * t) * (SIZE - 1));
      const y = Math.round((y1 + (y2 - y1) * t) * (SIZE - 1));
      for (const [dx, dy] of [
        [0, 0],
        [1, 0],
        [0, 1],
      ]) {
        if (x + dx < SIZE && y + dy < SIZE) cells[(y + dy) * SIZE + x + dx] = 1;
      }
    }
  }
  return { width: SIZE, height: SIZE, cells };
}

// 본보기 대신 쓰는 가짜 3획 글자: 가로줄 둘과 세로줄 하나(干 모양)
const glyph = draw([
  [0.2, 0.3, 0.8, 0.3],
  [0.1, 0.55, 0.9, 0.55],
  [0.5, 0.3, 0.5, 0.9],
]);

describe("손으로 쓴 글자 채점", () => {
  it("본보기를 따라 같은 획 수로 쓰면 맞다", () => {
    const ink = draw([
      [0.22, 0.31, 0.78, 0.29],
      [0.12, 0.56, 0.88, 0.54],
      [0.51, 0.32, 0.49, 0.88],
    ]);
    const r = checkWriting({ ink, glyph, strokesDrawn: 3, strokeCounts: [3] });
    expect(r.reasons).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it("아무 데나 세로줄 셋을 그으면 틀리고, 밖으로 나간 선과 빠진 부분을 알려 준다", () => {
    const ink = draw([
      [0.15, 0.1, 0.15, 0.9],
      [0.3, 0.1, 0.3, 0.9],
      [0.85, 0.1, 0.85, 0.9],
    ]);
    const r = checkWriting({ ink, glyph, strokesDrawn: 3, strokeCounts: [3] });
    expect(r.ok).toBe(false);
    expect(r.reasons).toEqual([
      "본보기 밖으로 나간 선이 많아요.",
      "본보기에서 빠진 부분이 있어요.",
    ]);
  });

  it("모양이 맞아도 획 수가 다르면 틀리고 교과서 획 수를 알려 준다", () => {
    const ink = draw([
      [0.2, 0.3, 0.8, 0.3],
      [0.1, 0.55, 0.9, 0.55],
      [0.5, 0.3, 0.5, 0.9],
    ]);
    const r = checkWriting({ ink, glyph, strokesDrawn: 1, strokeCounts: [3] });
    expect(r.ok).toBe(false);
    expect(r.reasons).toEqual(["3획으로 써요. 지금은 1획이에요."]);
  });

  it("획 수 후보가 둘이면 어느 쪽이든 받는다", () => {
    const r = checkWriting({
      ink: glyph,
      glyph,
      strokesDrawn: 3,
      strokeCounts: [4, 3],
    });
    expect(r.ok).toBe(true);
  });

  it("한 획만 빠뜨리면 빠진 부분을 알려 준다", () => {
    const ink = draw([[0.2, 0.3, 0.8, 0.3]]);
    const r = checkWriting({ ink, glyph, strokesDrawn: 1, strokeCounts: [] });
    expect(r.reasons).toEqual(["본보기에서 빠진 부분이 있어요."]);
  });
});
