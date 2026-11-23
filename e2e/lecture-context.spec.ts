import { expect, type Page, test } from "@playwright/test";
import {
  ILMUNTA_LECTURE_CUES,
  ILMUNTA_PAIR,
  ILMUNTA_PAIR_LESSON,
  LONG_LECTURE,
  LONG_LECTURE_BOOKLET,
  LONG_LECTURE_CUES,
} from "./fixtures/textbook";
import { login } from "./helpers/auth";
import { audioIsPlaying } from "./helpers/listen";

// 강의 맥락: 재생 위치에 맞춰 지금 하는 말을 띄우고, 소책자 문장과 맞춘 줄에는 뜻 카드를,
// "이 문장 반복"을 켜면 그 줄 끝에서 처음으로 돌아간다. 폰(지금 하는 말 칸)과 PC(오른쪽 자막 목록) 둘 다.

const LESSON = `/ilmuta/${LONG_LECTURE.no}?step=lecture`;
const MATCHED = LONG_LECTURE_CUES[1];
const UNMATCHED = LONG_LECTURE_CUES[3];

function audioTime(page: Page): Promise<number> {
  return page.evaluate(() => document.querySelector("audio")?.currentTime ?? 0);
}

async function seekAudio(page: Page, sec: number) {
  await page.evaluate((s) => {
    const a = document.querySelector("audio");
    if (a) a.currentTime = s;
  }, sec);
}

async function startLecture(page: Page) {
  await login(page, LESSON);
  await page
    .getByRole("button", { name: /강의 듣기/ })
    .first()
    .click();
  await expect.poll(() => audioIsPlaying(page)).toBe(true);
}

test("소책자 문장과 맞춘 자막 줄이 재생되면 그 문장의 뜻 카드가 뜨고, 짝 없는 줄은 자막만 보인다", async ({
  page,
}) => {
  await startLecture(page);
  await seekAudio(page, MATCHED.start + 1);
  await expect(
    page
      .getByText(LONG_LECTURE_BOOKLET.ko, { exact: true })
      .locator("visible=true"),
  ).toBeVisible();

  await seekAudio(page, UNMATCHED.start + 1);
  await expect(
    page
      .getByText(UNMATCHED.text, { exact: true })
      .locator("visible=true")
      .first(),
  ).toBeVisible();
  await expect(
    page
      .getByText(LONG_LECTURE_BOOKLET.ko, { exact: true })
      .locator("visible=true"),
  ).toHaveCount(0);
});

test("일문따 강의에서 예문 자막 짝과 맞춘 줄은 뜻 카드와 함께 받아 적은 글이라는 표시가 뜬다", async ({
  page,
}) => {
  await login(page, `/ilmunta/${ILMUNTA_PAIR_LESSON.no}`);
  await page.getByRole("button", { name: /처음부터 듣기|이어서 듣기/ }).click();
  await expect.poll(() => audioIsPlaying(page)).toBe(true);
  await seekAudio(page, ILMUNTA_LECTURE_CUES[1].start + 1);
  await expect(
    page.getByText(ILMUNTA_PAIR.ko, { exact: true }).locator("visible=true"),
  ).toBeVisible();
  await expect(
    page
      .getByText("자막에서 받아 적은 글 — 교재와 다를 수 있음")
      .locator("visible=true")
      .first(),
  ).toBeVisible();
});

test("이 문장 반복을 켜면 그 줄 끝에서 줄 처음으로 돌아가고, 다시 누르면 풀린다", async ({
  page,
}) => {
  await startLecture(page);
  await seekAudio(page, MATCHED.start + 0.5);
  const loop = page
    .getByRole("button", { name: /이 문장 반복|반복 중/ })
    .locator("visible=true");
  await loop.click();
  await expect(loop).toHaveAttribute("aria-pressed", "true");

  // 줄 끝 바로 앞으로 옮기면, 끝에 닿는 순간 줄 처음으로 돌아온다
  await seekAudio(page, MATCHED.end - 0.4);
  await expect
    .poll(() => audioTime(page), { timeout: 5_000 })
    .toBeLessThan(MATCHED.start + 2);
  expect(await audioTime(page)).toBeGreaterThanOrEqual(MATCHED.start);

  await loop.click();
  await expect(loop).toHaveAttribute("aria-pressed", "false");
});
