import { expect, type Page, test } from "@playwright/test";
import {
  FOLLOW_EXAMPLE,
  FOLLOW_EXAMPLE_CUES,
  LONG_LECTURE,
  LONG_LECTURE_CUES,
} from "./fixtures/textbook";
import { login } from "./helpers/auth";
import { audioIsPlaying } from "./helpers/listen";

// 강 화면이 소리를 따라간다: 재생기는 화면 안(폰은 위, PC는 오른쪽 칸 맨 위)에 늘 붙어 있고 시간은 거기에만,
// 예문을 틀면 지금 문장이 강조되고, 강의가 끝나 예문이 이어지면 화면도 그 구역으로 옮겨 간다.

const LESSON = `/ilmuta/${LONG_LECTURE.no}`;

function audioTime(page: Page): Promise<number> {
  return page.evaluate(() => document.querySelector("audio")?.currentTime ?? 0);
}

async function seekAudio(page: Page, sec: number) {
  await page.evaluate((s) => {
    const a = document.querySelector("audio");
    if (a) a.currentTime = s;
  }, sec);
}

/** 문형 구역의 예문 재생 단추(따라 말하기 구역에도 같은 이름의 고르기 칩이 있다) */
function patternsCard(page: Page) {
  return page
    .locator("#step-patterns")
    .getByRole("button", { name: /기본 문형 익히기/ });
}

/** 화면 안 재생기(폰·PC 가운데 보이는 것) */
function player(page: Page) {
  return page.locator("[data-inline-player]").locator("visible=true");
}

test("본문 단추로 재생하면 그 항목이 재생 중으로 보이고, 화면 안 재생기의 재생 위치가 늘어나며, 아래 막대는 따로 뜨지 않는다", async ({
  page,
}) => {
  await login(page, `${LESSON}?step=patterns`);
  const card = patternsCard(page);
  await card.click();
  await expect(card).toHaveAttribute("aria-pressed", "true");
  await expect(card).toContainText("재생 중");

  // 재생 위치가 0초에서 늘어나는 것이 화면 안 재생기에 보인다
  const time = player(page).locator("[data-player-time]");
  // 무음 mp3 길이는 16초 언저리(15.9…초면 0:15)
  await expect(time).toHaveText(/^0:0[1-9] \/ 0:1[56]$/, { timeout: 5_000 });
  // 시간·진행 막대는 화면 안 재생기 한 곳에만
  await expect(
    page.locator("[data-player-bar]").locator("visible=true"),
  ).toHaveCount(1);

  // 다시 누르면 멈춘다
  await card.click();
  await expect(card).toHaveAttribute("aria-pressed", "false");
  await expect.poll(() => audioIsPlaying(page)).toBe(false);
});

test("예문을 틀면 지금 소리 나는 문장이 강조되고, 한국어 안내 동안에도 방금 나온 문장을 붙든다", async ({
  page,
}) => {
  await login(page, `${LESSON}?step=patterns`);
  await patternsCard(page).click();
  await expect.poll(() => audioIsPlaying(page)).toBe(true);
  const current = page.locator(
    `[data-follow="${FOLLOW_EXAMPLE.id}"] [aria-current="true"]`,
  );

  await seekAudio(page, FOLLOW_EXAMPLE_CUES[1].start + 0.5);
  await expect(current).toContainText("산은 산이다.");
  // 두 문장 사이(말 없는 틈)에도 앞 문장을 붙든다
  await seekAudio(page, FOLLOW_EXAMPLE_CUES[1].end + 2);
  await expect(current).toContainText("산은 산이다.");
  await seekAudio(page, FOLLOW_EXAMPLE_CUES[2].start + 0.5);
  await expect(current).toContainText("산 위.");
  await expect(current).toHaveCount(1);
});

test("강의가 끝나 예문이 이어지면, 강의를 보던 화면도 글이 있는 예문 구역(단어)으로 옮겨 간다", async ({
  page,
}) => {
  await login(page, LESSON);
  await player(page).getByRole("button", { name: "강의 듣기" }).click();
  await expect.poll(() => audioIsPlaying(page)).toBe(true);
  await seekAudio(page, LONG_LECTURE.seconds - 1);

  // 강의 → 기본 회화 듣기(듣기만, 3초) → 기본 단어 익히기
  await expect(player(page)).toContainText(
    `${LONG_LECTURE.no}강 기본 단어 익히기`,
    {
      timeout: 15_000,
    },
  );
  await expect(page).toHaveURL(/\?step=words$/);
  await expect(
    page
      .getByRole("navigation", { name: "학습 단계" })
      .locator("[aria-current=step]"),
  ).toContainText("단어");
  await expect(page.locator("#step-words")).toBeInViewport();
});

test("A–B 단추로 시작과 끝을 찍으면 그 구간을 되풀이하고, 한 번 더 누르면 풀린다", async ({
  page,
}) => {
  await login(page, LESSON);
  await player(page).getByRole("button", { name: "강의 듣기" }).click();
  await expect.poll(() => audioIsPlaying(page)).toBe(true);
  const ab = player(page).getByRole("button", { name: /^A/ });

  await seekAudio(page, 10);
  await expect.poll(() => audioTime(page)).toBeGreaterThanOrEqual(10);
  await ab.click();
  await expect(ab).toHaveText(/B 찍기/);
  await seekAudio(page, 12);
  await expect.poll(() => audioTime(page)).toBeGreaterThanOrEqual(12);
  await ab.click();
  await expect(ab).toHaveAttribute("aria-pressed", "true");

  // 끝(12초쯤)에 닿으면 시작(10초쯤)으로 돌아온다
  await expect
    .poll(() => audioTime(page), { timeout: 5_000 })
    .toBeLessThan(11.5);
  expect(await audioTime(page)).toBeGreaterThanOrEqual(9.5);

  await ab.click();
  await expect(ab).toHaveAttribute("aria-pressed", "false");
});

test("PC 자막 줄을 누르고 곧바로 L을 누르면 누른 그 줄을 반복한다", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "PC 키보드 시험");
  await login(page, LESSON);
  await expect(page.locator("html")).toHaveAttribute("data-shortcuts", "on");
  await player(page).getByRole("button", { name: "강의 듣기" }).click();
  await expect.poll(() => audioIsPlaying(page)).toBe(true);

  const cue = LONG_LECTURE_CUES[2];
  const list = page.getByRole("region", { name: "강의 자막" });
  await list.getByRole("button", { name: cue.text }).click();
  await page.keyboard.press("l");
  await expect(
    player(page).getByRole("button", { name: "문장 반복 풀기" }),
  ).toBeVisible();

  // 줄 끝 바로 앞으로 옮기면 그 줄 처음으로 돌아온다(앞 줄로 새거나 반복이 풀리지 않는다)
  await seekAudio(page, cue.end - 0.4);
  await expect
    .poll(() => audioTime(page), { timeout: 5_000 })
    .toBeLessThan(cue.start + 2);
  expect(await audioTime(page)).toBeGreaterThanOrEqual(cue.start - 0.5);
});
