import { expect, type Page, test } from "@playwright/test";
import { FOLLOW_EXAMPLE_CUES, LONG_LECTURE } from "./fixtures/textbook";
import { TAP_WORD } from "./fixtures/word-tap";
import { audioIsPlaying } from "./helpers/listen";

// 낱말 사전: 로마자로 찾아 낱말 화면에 들어가 예문 소리를 듣고, 예문 낱말 창에서도 사전으로 간다.

test("로마자로 낱말을 찾아 들어가면 읽는 법·처음 배운 강·나오는 예문이 보이고, 예문을 누르면 소리가 난다", async ({
  page,
}) => {
  await page.goto("/words");
  await page.getByRole("searchbox").fill("yama");
  await page
    .getByRole("region", { name: "찾은 낱말" })
    .getByRole("link", { name: new RegExp(TAP_WORD.surface) })
    .first()
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/words/${encodeURIComponent(TAP_WORD.surface)}$`),
  );
  await expect(
    page
      .getByRole("link", { name: /일무따 1강/ })
      .locator("visible=true")
      .first(),
  ).toBeVisible();
  await expect(
    page
      .getByRole("link", { name: /네이버 사전/ })
      .locator("visible=true")
      .first(),
  ).toBeVisible();

  const play = page.getByRole("button", { name: /예문 듣기/ }).first();
  await play.click();
  await expect.poll(() => audioIsPlaying(page)).toBe(true);
});

/** 재생기 <audio>의 지금 위치(초) */
const audioPos = (page: Page) =>
  page.evaluate(() => document.querySelector("audio")?.currentTime ?? -1);

test("같은 화면에서 같은 mp3의 예문 둘을 차례로 누르면 두 번째도 그 문장 자리부터 나온다", async ({
  page,
}) => {
  await page.goto(`/words/${encodeURIComponent(TAP_WORD.surface)}`);
  // 가짜 3강 문형 예문 mp3에는 두 문장이 3초와 9초 자리에 있다
  const [first, second] = FOLLOW_EXAMPLE_CUES.filter((c) => c.lang === "ja");
  const plays = page.getByRole("button", {
    name: new RegExp(`${LONG_LECTURE.no}강 .*예문 듣기`),
  });
  await expect(plays).toHaveCount(2);

  // 그 자리에서 0.5초 넘게 이어 재생되는지 본다. 파일 처음(0초)으로 돌아갔다면 제한 시간 안에
  // 문장 자리까지 다시 오지 못한다
  const settled = { timeout: 4_000 };
  await plays.nth(0).click();
  await expect
    .poll(() => audioPos(page), settled)
    .toBeGreaterThanOrEqual(first.start + 0.5);

  await plays.nth(1).click();
  await expect
    .poll(() => audioPos(page), settled)
    .toBeGreaterThanOrEqual(second.start + 0.5);
});

test("예문 낱말 창의 '사전에서 보기'로 그 낱말의 사전 화면에 간다", async ({
  page,
}) => {
  await page.goto(`/ilmuta/${LONG_LECTURE.no}?step=patterns`);
  await page
    .locator("[data-word-tap]", { hasText: TAP_WORD.surface })
    .first()
    .click();
  await page.getByRole("link", { name: "사전에서 보기 →" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/words/${encodeURIComponent(TAP_WORD.surface)}$`),
  );
  await expect(page.getByRole("region", { name: "나오는 예문" })).toContainText(
    TAP_WORD.surface,
  );
});
