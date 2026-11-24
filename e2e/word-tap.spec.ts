import { expect, type Page, test } from "@playwright/test";
import { LONG_LECTURE, LONG_LECTURE_CUES } from "./fixtures/textbook";
import { TAP_WORD } from "./fixtures/word-tap";
import { login } from "./helpers/auth";
import { audioIsPlaying } from "./helpers/listen";

// 예문 낱말·글자 누르기: 낱말을 누르면 정보 창(폰은 아래 시트, PC는 오른쪽 창)이 뜨고,
// 초반 강이라 글자 하나씩이 펼쳐져 있다. 키보드로 앞뒤 낱말·닫기. 분석이 없는 강은 글자 하나씩 누른다.

const panel = (page: Page) => page.locator("[data-word-panel]");

test("예문 낱말을 누르면 뜻·읽는 법·글자 하나씩이 뜨고, →로 다음 낱말, Esc로 닫으면 누른 낱말로 초점이 돌아간다", async ({
  page,
}) => {
  await page.goto(`/ilmuta/${LONG_LECTURE.no}?step=patterns`);
  const word = page
    .getByRole("button", { name: TAP_WORD.surface, exact: false })
    .and(page.locator("[data-word-tap]"))
    .first();
  await word.click();

  const dialog = panel(page);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(TAP_WORD.gloss)).toBeVisible();
  await expect(
    dialog.getByRole("heading", { name: "글자 하나씩" }),
  ).toBeVisible();

  // 글자를 누르면 그 글자 풀이
  await dialog
    .getByRole("list", { name: "글자 하나씩" })
    .getByRole("button")
    .first()
    .click();
  await expect(dialog.getByText("한글로 비슷하게:")).toBeVisible();

  // → 다음 낱말(조사 は): 조사로 읽는 법 알림
  await page.keyboard.press("ArrowRight");
  await expect(
    dialog.getByText("조사로 쓰일 때는 '와'로 읽는다."),
  ).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(word).toBeFocused();
});

test("PC에서 낱말 창은 오른쪽 칸의 재생기 아래를 덮고(재생기는 가리지 않음), 창이 열린 동안 ←·→는 앞뒤 낱말·닫히면 재생기 5초 옮기기", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "PC 배치");
  await login(page, `/ilmuta/${LONG_LECTURE.no}?step=lecture`);
  await page
    .getByRole("button", { name: /강의 듣기/ })
    .first()
    .click();
  await expect.poll(() => audioIsPlaying(page)).toBe(true);
  await page
    .locator("[data-inline-player] button[aria-label='멈춤']")
    .locator("visible=true")
    .click();
  const audioTime = () =>
    page.evaluate(() => document.querySelector("audio")?.currentTime ?? 0);
  await page.evaluate(() => {
    const a = document.querySelector("audio");
    if (a) a.currentTime = 8;
  });

  await page.locator("#step-patterns [data-word-tap]").first().click();
  const dialog = panel(page);
  await expect(dialog).toHaveAttribute("data-word-panel-place", "aside");

  // 창 위쪽이 재생기 아래에 있고, 가운데 교재 칸과 겹치지 않는다
  const player = page.locator("[data-inline-player]").locator("visible=true");
  const pBox = await player.boundingBox();
  const dBox = await dialog.boundingBox();
  const textBox = await page.locator("#step-patterns").boundingBox();
  expect(pBox && dBox && textBox).toBeTruthy();
  if (!pBox || !dBox || !textBox) return;
  expect(dBox.y).toBeGreaterThanOrEqual(pBox.y + pBox.height);
  expect(dBox.x).toBeGreaterThanOrEqual(textBox.x + textBox.width);

  // 초점을 창 밖(본문)으로 옮겨도 ←는 앞 낱말일 뿐 재생 위치를 옮기지 않는다
  await page.locator("h1").click();
  const before = await audioTime();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowLeft");
  await expect(dialog).toBeVisible();
  expect(await audioTime()).toBeCloseTo(before, 1);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await page.locator("h1").click();
  await page.keyboard.press("ArrowRight");
  await expect.poll(audioTime).toBeGreaterThan(before + 4);
});

test("폰 재생기가 접혀도 지금 일본어 줄의 낱말을 눌러 창을 열고, 소리는 계속 난다", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "폰 배치");
  await login(page, `/ilmuta/${LONG_LECTURE.no}`);
  await page.getByRole("button", { name: "강의 듣기" }).click();
  await expect.poll(() => audioIsPlaying(page)).toBe(true);
  await page.evaluate((s) => {
    const a = document.querySelector("audio");
    if (a) a.currentTime = s;
  }, LONG_LECTURE_CUES[1].start + 1);

  // 내려 읽어 재생기를 접는다(접히며 높이가 바뀌어 스크롤이 끊기므로 볼 때마다 다시 옮긴다)
  const line = page.locator("[data-inline-player] [data-cue-tap-line]");
  await expect
    .poll(async () => {
      await page.evaluate(() =>
        window.scrollTo({ top: 1200, behavior: "instant" }),
      );
      return line.isVisible();
    })
    .toBe(true);
  await line.locator("[data-word-tap]").first().click();
  await expect(panel(page).getByText("시험", { exact: true })).toBeVisible();
  expect(await audioIsPlaying(page)).toBe(true);
});

test("낱말 분석이 없는 초반 강의 예문은 글자 하나씩 눌러 소리·한글 근사치를 본다", async ({
  page,
}) => {
  await page.goto("/ilmuta/1?step=patterns");
  // 히라가나 글자(한자는 한글 근사치 대신 "낱말마다 읽는 법이 다르다"가 나온다)
  await page.locator("[data-word-tap]", { hasText: "は" }).first().click();
  const dialog = panel(page);
  await expect(dialog).toHaveAttribute("aria-label", "글자 설명");
  await expect(dialog.getByText("한글로 비슷하게:")).toBeVisible();
});

test("강의 자막의 소책자 문장 카드에서 낱말을 눌러 정보 창을 연다", async ({
  page,
}) => {
  await login(page, `/ilmuta/${LONG_LECTURE.no}?step=lecture`);
  await page
    .getByRole("button", { name: /강의 듣기/ })
    .first()
    .click();
  await expect.poll(() => audioIsPlaying(page)).toBe(true);
  await page.evaluate((s) => {
    const a = document.querySelector("audio");
    if (a) a.currentTime = s;
  }, LONG_LECTURE_CUES[1].start + 1);

  const chips = page
    .getByRole("list", { name: "낱말 눌러 보기" })
    .locator("visible=true")
    .first();
  await expect(chips).toBeVisible();
  await chips.getByRole("button").first().click();
  await expect(panel(page).getByText("시험", { exact: true })).toBeVisible();
});
