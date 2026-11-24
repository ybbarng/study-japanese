import { expect, type Page, test } from "@playwright/test";
import { LONG_LECTURE, LONG_LECTURE_CUES } from "./fixtures/textbook";
import { login } from "./helpers/auth";
import { audioIsPlaying } from "./helpers/listen";

// 학습자 점검 3차(2026-11-24)가 찾은 PC 강의 무대의 빈곳: 앞뒤 줄 표시, 보이는 줄과 반복이 잡는 줄,
// 무대가 한 화면에 들어오는지.
test.skip(
  ({ isMobile }) => isMobile,
  "PC 화면 전용 시험(폰 프로젝트는 건너뛴다)",
);

const LESSON = `/ilmuta/${LONG_LECTURE.no}?step=lecture`;
const JA = LONG_LECTURE_CUES[1];
const KO = LONG_LECTURE_CUES[2];
const NEXT_JA = LONG_LECTURE_CUES[3];

function audioTime(page: Page): Promise<number> {
  return page.evaluate(() => document.querySelector("audio")?.currentTime ?? 0);
}

async function seekAudio(page: Page, sec: number) {
  await page.evaluate((s) => {
    const a = document.querySelector("audio");
    if (a) a.currentTime = s;
  }, sec);
}

/** 가운데 강의 구역의 재생 카드로 강의를 튼다(무대가 생긴다) */
async function startFromCenter(page: Page) {
  await login(page, LESSON);
  await page
    .locator("main")
    .getByRole("button", { name: /이 강 강의/ })
    .first()
    .click();
  await expect.poll(() => audioIsPlaying(page)).toBe(true);
  const stage = page.locator("[data-lecture-stage]");
  await expect(stage).toBeVisible();
  return stage;
}

test("강의를 틀면 PC 무대가 한 화면 안에 들어오도록 굴러 간다", async ({
  page,
}) => {
  const stage = await startFromCenter(page);
  await expect
    .poll(async () => {
      const box = await stage.boundingBox();
      return box ? Math.round(box.y + box.height) : 9999;
    })
    .toBeLessThanOrEqual(900);
  const box = await stage.boundingBox();
  expect(box?.y ?? -1).toBeGreaterThanOrEqual(0);
});

test("무대 아래 앞뒤 줄에 '앞'·'다음'이 붙는다", async ({ page }) => {
  const stage = await startFromCenter(page);
  await seekAudio(page, NEXT_JA.start + 1);
  const prev = stage.locator('[data-dim="prev"]');
  await expect(prev).toContainText("앞");
  await expect(prev).toContainText(KO.text);

  await seekAudio(page, KO.start + 2);
  const next = stage.locator('[data-dim="next"]');
  await expect(next).toContainText("다음");
  await expect(next).toContainText(NEXT_JA.text);
});

test("붙든 일본어와 지금 설명이 함께 보이면 반복 단추가 둘로 나뉘고, '이 일본어 반복'은 보이는 일본어 줄을 되풀이한다", async ({
  page,
}) => {
  const stage = await startFromCenter(page);
  await seekAudio(page, KO.start + 2);
  const here = stage.getByRole("button", { name: /지금 말 반복/ });
  const held = stage.getByRole("button", { name: /이 일본어 반복/ });
  await expect(here).toBeVisible();
  await expect(held).toBeVisible();

  await held.click();
  await expect
    .poll(() => audioTime(page), { timeout: 5_000 })
    .toBeLessThan(JA.end + 1);
  expect(await audioTime(page)).toBeGreaterThanOrEqual(JA.start - 0.5);
  // 그 줄을 듣는 동안에는 단추 하나로 돌아오고 반복 중이다
  await expect(stage.getByRole("button", { name: /반복 중/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
