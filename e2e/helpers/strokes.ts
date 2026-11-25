import type { Locator, Page } from "@playwright/test";

/** 0~1(칸 넓이에 대한 몫) 좌표의 획 */
export type FracStroke = [number, number][];

/**
 * 화면의 본보기 획(KanjiVG 경로)을 차례대로 점으로 읽는다. 본보기 SVG는 쓰기 칸과 같은
 * 정사각형이라 칸 넓이에 대한 몫으로 돌려준다.
 */
export async function guideStrokes(page: Page): Promise<FracStroke[]> {
  return page.evaluate(() => {
    const svg = document.querySelector<SVGSVGElement>("svg[data-stroke-guide]");
    if (!svg) return [];
    const size = svg.viewBox.baseVal.width;
    return [...svg.querySelectorAll<SVGPathElement>("path[data-stroke]")].map(
      (p) => {
        const len = p.getTotalLength();
        const m = p.transform.baseVal.consolidate()?.matrix;
        const a = m?.a ?? 1;
        const d = m?.d ?? 1;
        const e = m?.e ?? 0;
        const f = m?.f ?? 0;
        return Array.from({ length: 14 }, (_, i) => {
          const q = p.getPointAtLength((len * i) / 13);
          return [(a * q.x + e) / size, (d * q.y + f) / size] as [
            number,
            number,
          ];
        });
      },
    );
  });
}

/** 칸 위에 획 하나를 긋는다 */
export async function drawStroke(page: Page, pad: Locator, st: FracStroke) {
  const box = await pad.boundingBox();
  if (!box) throw new Error("쓰기 칸 자리를 모름");
  const at = ([x, y]: [number, number]) =>
    [box.x + x * box.width, box.y + y * box.height] as const;
  await page.mouse.move(...at(st[0]));
  await page.mouse.down();
  for (const p of st.slice(1)) await page.mouse.move(...at(p), { steps: 2 });
  await page.mouse.up();
}

/** 본보기 획을 차례대로 따라 긋는다. `reversed`에 든 차례(0부터)의 획은 끝에서 시작으로 긋는다 */
export async function traceGuide(
  page: Page,
  pad: Locator,
  reversed: number[] = [],
) {
  const strokes = await guideStrokes(page);
  if (strokes.length === 0) throw new Error("본보기 획이 없음");
  for (const [i, st] of strokes.entries())
    await drawStroke(page, pad, reversed.includes(i) ? [...st].reverse() : st);
  return strokes.length;
}
