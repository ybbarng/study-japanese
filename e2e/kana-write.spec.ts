import { expect, type Page, test } from "@playwright/test";
import { BASIC } from "@/lib/kana/data";

/** 알아보기 문제 하나를 가나 자료로 맞힌다 */
async function answerQuiz(page: Page) {
  const main = page.locator("main");
  const choices = main.locator("button.h-24");
  if (await main.getByText("소리를 듣고 글자를 고르세요").count()) {
    const show = main.getByRole("button", { name: "글로 보기" });
    const soundText = main.locator("p.text-2xl");
    // 소리 파일이 없으면 화면이 "글로 보기" 단추를 저절로 소리 글로 바꾼다. 단추를 본 직후 바뀌면
    // 사라진 단추를 끝없이 누르려 하므로, 누르기는 짧게 해 보고 소리 글이 보일 때까지 되풀이한다
    await expect(async () => {
      if (await show.isVisible()) await show.click({ timeout: 1_000 });
      await expect(soundText).toBeVisible({ timeout: 1_000 });
    }).toPass();
    // 소리 글(예: `에 e`)의 로마자로 글자를 찾는다
    const text = (await soundText.textContent()) ?? "";
    const romaji = text.trim().split(/\s+/).pop();
    const sound = BASIC.find((s) => s.romaji === romaji);
    if (!sound) throw new Error(`모르는 소리: ${text}`);
    const chars = [sound.hira, sound.kata].filter(Boolean).join("|");
    await choices.filter({ hasText: new RegExp(`(${chars})$`) }).click();
  } else {
    const char = (
      await main.locator("span[lang=ja]").first().textContent()
    )?.trim();
    const sound = BASIC.find((s) => s.hira === char || s.kata === char);
    if (!sound) throw new Error(`모르는 글자: ${char}`);
    await choices
      .filter({ hasText: new RegExp(`${sound.ko}${sound.romaji}$`) })
      .click();
  }
}

/** 알아보기에서 맞힌 뒤 다음 문제로 넘어가기까지(quiz-runner.tsx의 650ms보다 조금 길게) */
const QUIZ_ADVANCE_MS = 700;

/** 첫 레슨의 소개를 넘기고 알아보기를 맞혀 쓰기 칸까지 간다 */
async function gotoWriteStep(page: Page) {
  // 맞힌 뒤 저절로 넘어가는 타이머(650ms)를 기다리지 않고 바로 돌린다. 문제가 스무 개쯤이라
  // 그냥 기다리면 이 단계만 15초가 넘게 걸렸다. 시계는 그 밖에는 실제 시간대로 흐른다
  await page.clock.install();
  await page.goto("/kana/lesson/h1");
  const pad = page.getByLabel(/쓰기 칸$/);
  const main = page.locator("main");
  for (let i = 0; i < 200 && (await pad.count()) === 0; i++) {
    const next = main
      .locator("button:not([disabled])")
      .filter({ hasText: /^(다음|연습)/ });
    if (await next.count()) await next.first().click();
    else if (await main.locator("button.h-24:not([disabled])").count()) {
      await answerQuiz(page);
      await page.clock.runFor(QUIZ_ADVANCE_MS);
      // 맞히면 정답 칸이 초록으로 칠해졌다가 저절로 다음 문제로 넘어간다. 바뀐 뒤에 다음 문제를 읽는다
      await expect(main.locator("button.h-24.border-good")).toHaveCount(0);
    } else await page.waitForTimeout(100);
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
  test.slow(); // 소개·알아보기를 지나 쓰기 칸까지 가는 데 10초쯤 걸린다(부하가 크면 그 몇 배)
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
  test.slow();
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
