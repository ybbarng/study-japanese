import { expect, type Page } from "@playwright/test";
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
export async function gotoWriteStep(page: Page) {
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
