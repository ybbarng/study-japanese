import { expect, type Page, test } from "@playwright/test";

/** 첫 레슨의 소개·알아보기를 아무 답으로 지나 쓰기 칸까지 간다 */
async function gotoWriteStep(page: Page) {
  await page.goto("/kana/lesson/h1");
  const pad = page.getByLabel(/쓰기 칸$/);
  for (let i = 0; i < 400 && (await pad.count()) === 0; i++) {
    const next = page
      .locator("main button:not([disabled])")
      .filter({ hasText: /^(다음|연습)/ });
    if (await next.count()) {
      await next.first().click();
    } else {
      const options = page.locator("main button:not([disabled])");
      const n = await options.count();
      if (n > 0) await options.nth(Math.min(1, n - 1)).click();
    }
  }
  await expect(pad).toBeVisible();
  return pad;
}

async function drawLine(
  page: Page,
  box: { x: number; y: number; width: number; height: number },
  from: [number, number],
  to: [number, number],
) {
  await page.mouse.move(
    box.x + from[0] * box.width,
    box.y + from[1] * box.height,
  );
  await page.mouse.down();
  await page.mouse.move(box.x + to[0] * box.width, box.y + to[1] * box.height, {
    steps: 10,
  });
  await page.mouse.up();
}

test("가나 쓰기: 아무 선 셋은 통과하지 못하고 까닭과 획 번호를 보인다", async ({
  page,
}) => {
  const pad = await gotoWriteStep(page);
  await expect(page.getByText(/소리 글자를 써 보세요/)).toBeVisible();
  const box = await pad.boundingBox();
  if (!box) throw new Error("쓰기 칸 자리를 모름");

  for (const x of [0.15, 0.5, 0.85])
    await drawLine(page, box, [x, 0.1], [x, 0.9]);
  await page.getByRole("button", { name: "다 썼어요" }).click();

  await expect(page.getByText("본보기 밖으로 나간 선이 많아요.")).toBeVisible();
  await expect(page.getByRole("button", { name: "다음 글자" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "다시 쓰기" })).toBeVisible();
});

test("가나 쓰기: 본보기를 덮어 같은 획 수로 쓰면 통과한다", async ({
  page,
}) => {
  const pad = await gotoWriteStep(page);
  const box = await pad.boundingBox();
  if (!box) throw new Error("쓰기 칸 자리를 모름");
  const strokes = Number(
    (await page.getByText(/· \d+획/).textContent())?.match(/(\d+)획/)?.[1],
  );

  // 화면 본보기 글자가 차지한 칸(48×48)을 가로 구간으로 읽는다
  const segments = await page.evaluate(() => {
    const canvas = document.querySelector('[aria-label$="쓰기 칸"]');
    const glyph = canvas?.parentElement?.querySelector("span[lang=ja]");
    if (!canvas || !glyph) return [];
    const pad = canvas.getBoundingClientRect();
    const r = glyph.getBoundingClientRect();
    const st = getComputedStyle(glyph);
    const G = 48;
    const c = document.createElement("canvas");
    c.width = G;
    c.height = G;
    const ctx = c.getContext("2d");
    if (!ctx) return [];
    ctx.scale(G / pad.width, G / pad.height);
    ctx.font = `${st.fontWeight} ${st.fontSize} ${st.fontFamily}`;
    ctx.textAlign = "center";
    const text = glyph.textContent ?? "";
    const m = ctx.measureText(text);
    ctx.fillText(
      text,
      r.left - pad.left + r.width / 2,
      r.top -
        pad.top +
        (r.height - m.fontBoundingBoxAscent - m.fontBoundingBoxDescent) / 2 +
        m.fontBoundingBoxAscent,
    );
    const d = ctx.getImageData(0, 0, G, G).data;
    const out: [number, number, number][] = [];
    for (let y = 0; y < G; y++) {
      let start = -1;
      for (let x = 0; x <= G; x++) {
        const on = x < G && d[(y * G + x) * 4 + 3] > 96;
        if (on && start < 0) start = x;
        if (!on && start >= 0) {
          out.push([start / (G - 1), (x - 1) / (G - 1), y / (G - 1)]);
          start = -1;
        }
      }
    }
    return out;
  });
  expect(segments.length).toBeGreaterThan(strokes);

  // 구간들을 획 수만큼의 묶음으로 나눠, 묶음마다 펜을 한 번 내려 덮는다
  const per = Math.ceil(segments.length / strokes);
  for (let k = 0; k < strokes; k++) {
    const group = segments.slice(k * per, (k + 1) * per);
    await page.mouse.move(
      box.x + group[0][0] * box.width,
      box.y + group[0][2] * box.height,
    );
    await page.mouse.down();
    for (const [x1, x2, y] of group) {
      await page.mouse.move(box.x + x1 * box.width, box.y + y * box.height);
      await page.mouse.move(box.x + x2 * box.width, box.y + y * box.height, {
        steps: 3,
      });
    }
    await page.mouse.up();
  }
  await page.getByRole("button", { name: "다 썼어요" }).click();
  await expect(page.getByText(/잘 썼어요!/)).toBeVisible();
  await page.getByRole("button", { name: "다음 글자" }).click();
  await expect(page.getByText(/^2 \/ \d+$/)).toBeVisible();
});
