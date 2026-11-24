import { expect, type Page, test } from "@playwright/test";
import {
  ILMUNTA_LECTURE_CUES,
  ILMUNTA_PAIR,
  ILMUNTA_PAIR_LESSON,
  LONG_LECTURE,
  LONG_LECTURE_BOOKLET,
  LONG_LECTURE_CUES,
  TALK_LECTURE,
  TALK_LECTURE_CUES,
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
  // 강 화면은 교재 구역(회화·따라 말하기)이 한 장으로 이어져 같은 문장이 교재에도 보이므로,
  // 재생기 곁의 "지금 하는 말" 칸 안에서만 본다
  const now = page
    .getByRole("region", { name: "지금 하는 말" })
    .locator("visible=true");
  await seekAudio(page, MATCHED.start + 1);
  await expect(
    now.getByText(LONG_LECTURE_BOOKLET.ko, { exact: true }),
  ).toBeVisible();

  await seekAudio(page, UNMATCHED.start + 1);
  await expect(
    now.getByText(UNMATCHED.text, { exact: true }).first(),
  ).toBeVisible();
  await expect(
    now.getByText(LONG_LECTURE_BOOKLET.ko, { exact: true }),
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

test("긴 한국어 설명 뒤에는 오래된 일본어 줄이 지금 칸에 남지 않고, 이 문장 반복도 그 줄로 가지 않는다", async ({
  page,
}) => {
  await login(page, `/ilmuta/${TALK_LECTURE.no}`);
  await page
    .getByRole("button", { name: /강의 듣기/ })
    .first()
    .click();
  await expect.poll(() => audioIsPlaying(page)).toBe(true);
  const now = page
    .getByRole("region", { name: "지금 하는 말" })
    .locator("visible=true")
    .first();
  const old = TALK_LECTURE_CUES[1];

  // 일본어 줄이 소리 나는 동안에는 지금 칸에 보인다
  await seekAudio(page, old.start + 0.5);
  await expect(now.getByText(old.text).first()).toBeVisible();

  // 한국어 설명이 40초 넘게 이어진 뒤: 그 일본어 줄은 내려가고 지금 설명 줄이 보인다
  const talk = TALK_LECTURE_CUES[12];
  await seekAudio(page, talk.start + 0.5);
  await expect(now.getByText(talk.text).first()).toBeVisible();
  await expect(now.getByText(old.text)).toHaveCount(0);

  // 이 문장 반복은 지금 들리는 설명 줄을 잡는다(몇십 초 전 일본어 줄로 끌려가지 않는다)
  const loop = now.getByRole("button", { name: /이 문장 반복|반복 중/ });
  await loop.click();
  await expect(loop).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(() => audioTime(page), { timeout: 5_000 })
    .toBeGreaterThanOrEqual(talk.start - 0.5);
  expect(await audioTime(page)).toBeLessThan(talk.end + 2);
  await loop.click();
  await expect(loop).toHaveAttribute("aria-pressed", "false");
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
