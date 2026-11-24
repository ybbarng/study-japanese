/**
 * 손으로 쓴 글자를 본보기와 견준다. 화면이 같은 크기의 격자 두 장을 만들어 넘긴다:
 * 쓴 잉크가 지나간 칸, 본보기 글자가 차지한 칸. 그 둘로
 *   - 쓴 잉크 가운데 본보기 근처에 떨어진 몫(밖으로 많이 나가면 틀림)
 *   - 본보기 가운데 쓴 잉크가 지나간 몫(빠진 획이 있으면 틀림)
 * 을 보고, 획 수가 맞는지 함께 본다. 획 방향은 획 데이터가 없어 아직 보지 않는다.
 */

export interface Grid {
  width: number;
  height: number;
  /** 길이 width*height, 1이면 칠해진 칸 */
  cells: Uint8Array;
}

export interface WriteCheck {
  ok: boolean;
  strokesDrawn: number;
  /** 획 수 후보가 없으면(모르는 글자) null */
  strokesExpected: number | null;
  /** 쓴 잉크 가운데 본보기 근처에 있는 몫(0~1) */
  inside: number;
  /** 본보기 가운데 쓴 잉크가 지나간 몫(0~1) */
  covered: number;
  /** 틀렸을 때 학습자에게 보일 까닭(맞으면 빈 배열) */
  reasons: string[];
}

/** 칠해진 칸에서 `radius` 칸 안쪽을 모두 칠한 격자 */
export function dilate(grid: Grid, radius: number): Grid {
  const { width, height, cells } = grid;
  const out = new Uint8Array(cells.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!cells[y * width + x]) continue;
      for (let dy = -radius; dy <= radius; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) continue;
        for (let dx = -radius; dx <= radius; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= width || dx * dx + dy * dy > radius * radius)
            continue;
          out[yy * width + xx] = 1;
        }
      }
    }
  }
  return { width, height, cells: out };
}

/** `a`의 칠한 칸 가운데 `b`에도 칠해진 몫 */
function share(a: Grid, b: Grid): number {
  let total = 0;
  let hit = 0;
  for (let i = 0; i < a.cells.length; i++) {
    if (!a.cells[i]) continue;
    total++;
    if (b.cells[i]) hit++;
  }
  return total === 0 ? 0 : hit / total;
}

export const WRITE_RULES = {
  /** 쓴 잉크의 이만큼은 본보기 근처여야 한다 */
  minInside: 0.75,
  /** 본보기의 이만큼은 쓴 잉크가 지나가야 한다 */
  minCovered: 0.6,
  /** 근처로 보는 거리(격자 넓이에 대한 몫) */
  slack: 0.07,
};

export function checkWriting({
  ink,
  glyph,
  strokesDrawn,
  strokeCounts,
  rules = WRITE_RULES,
}: {
  ink: Grid;
  glyph: Grid;
  strokesDrawn: number;
  /** 받을 획 수 후보(첫 값이 교과서 획 수). 비어 있으면 획 수는 보지 않는다 */
  strokeCounts: number[];
  rules?: typeof WRITE_RULES;
}): WriteCheck {
  const radius = Math.max(1, Math.round(ink.width * rules.slack));
  const inside = share(ink, dilate(glyph, radius));
  const covered = share(glyph, dilate(ink, radius));
  const expected = strokeCounts.length > 0 ? strokeCounts[0] : null;
  const reasons: string[] = [];
  if (strokeCounts.length > 0 && !strokeCounts.includes(strokesDrawn)) {
    reasons.push(`${expected}획으로 써요. 지금은 ${strokesDrawn}획이에요.`);
  }
  if (inside < rules.minInside) {
    reasons.push("본보기 밖으로 나간 선이 많아요.");
  }
  if (covered < rules.minCovered) {
    reasons.push("본보기에서 빠진 부분이 있어요.");
  }
  return {
    ok: reasons.length === 0,
    strokesDrawn,
    strokesExpected: expected,
    inside,
    covered,
    reasons,
  };
}
