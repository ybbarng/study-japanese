import { type Browser, expect, type Page, test } from "@playwright/test";
import { FAKE_LYRICS, SONG_FILE } from "./fixtures/song";
import { login } from "./helpers/auth";
import { audioIsPlaying } from "./helpers/listen";

// 노래 학습: 가사 화면은 공개, 노래 파일은 로그인한 사람만. 가사는 지어낸 줄이다(e2e/fixtures/song.ts).

const SONG_URL = `/media/songs/${SONG_FILE}`;

function audioTime(page: Page): Promise<number> {
  return page.evaluate(() => document.querySelector("audio")?.currentTime ?? 0);
}

/** 관리자 쿠키로 노래를 바로 넣는다(화면 흐름은 다른 시험이 본다) */
async function putSong(page: Page, slug: string, lyricsPublic: boolean) {
  const res = await page.request.put(`/api/songs/${slug}`, {
    data: {
      title: "テストのうた",
      artist: "시험 가수",
      audioFile: SONG_FILE,
      lyricsPublic,
      lines: FAKE_LYRICS.map((ja) => ({ ja })),
    },
  });
  expect(res.status()).toBe(200);
}

async function visitorPage(browser: Browser, baseURL: string | undefined) {
  const context = await browser.newContext({ baseURL });
  return context.newPage();
}

test("방문자는 노래 파일을 받을 수 없다(403)", async ({ request }) => {
  const res = await request.get(SONG_URL);
  expect(res.status()).toBe(403);
});

test("방문자는 공개한 노래의 가사·읽는 법을 보고 줄을 익힘으로 표시하지만, 재생 단추 대신 안내를 본다", async ({
  page,
  browser,
  baseURL,
}) => {
  await login(page, "/songs");
  await putSong(page, "e2e-public", true);

  const visitor = await visitorPage(browser, baseURL);
  await visitor.goto("/songs");
  const card = visitor.getByRole("link", { name: /テストのうた/ });
  await expect(card).toContainText("익힌 줄 0/4");
  await card.click();
  await expect(visitor).toHaveURL("/songs/e2e-public");

  const lyrics = visitor.getByRole("list", { name: "가사" });
  await expect(lyrics.locator("rt", { hasText: "そら" })).toBeVisible();
  // 폰에서는 가사 위, PC에서는 곁칸에 같은 안내가 있다. 지금 화면에 보이는 쪽을 본다
  await expect(
    visitor
      .getByText(/노래 재생은 로그인한 사람만 할 수 있습니다\. 가사·읽는 법/)
      .filter({ visible: true }),
  ).toBeVisible();
  await expect(visitor.getByRole("button", { name: "노래 틀기" })).toHaveCount(
    0,
  );
  await expect(
    visitor.getByText(/가사·음원의 저작권은 각 권리자/),
  ).toBeVisible();

  await visitor.getByRole("button", { name: "1번째 줄 익힘" }).click();
  await expect(visitor.getByText("익힌 줄 1/4")).toBeVisible();
  await visitor.context().close();
});

test("관리자가 가사 공개를 끄면 방문자에게는 노래가 보이지 않는다", async ({
  page,
  browser,
  baseURL,
}) => {
  await login(page, "/songs");
  await putSong(page, "e2e-hidden", false);

  const visitor = await visitorPage(browser, baseURL);
  expect((await visitor.request.get("/api/songs/e2e-hidden")).status()).toBe(
    404,
  );
  const res = await visitor.goto("/songs/e2e-hidden");
  expect(res?.status()).toBe(404);
  await visitor.context().close();
});

test("관리자는 노래를 넣고, 박자를 맞춘 뒤, 줄을 누르면 그 줄의 시작으로 간다", async ({
  page,
  isMobile,
}) => {
  test.setTimeout(60_000);
  await login(page, "/songs");
  await page.getByRole("link", { name: "노래 넣기" }).click();
  await expect(page).toHaveURL("/songs/new");

  await page.getByLabel("가사 붙여 넣기").fill(FAKE_LYRICS.join("\n"));
  await page.getByLabel("제목").fill("ながれのうた");
  await page.getByLabel("가수").fill("시험 가수");
  await page.getByLabel("주소 이름(slug)").fill("e2e-flow");
  await page.getByLabel("오디오 파일 이름").fill(SONG_FILE);
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page).toHaveURL("/songs/e2e-flow");

  // 저장할 때 서버가 형태소 분석으로 읽는 법과 낱말을 만들어 둔다
  const lyrics = page.getByRole("list", { name: "가사" });
  await expect(lyrics.locator("rt", { hasText: "そら" })).toBeVisible();
  await lyrics.getByRole("button", { name: /降/ }).click();
  const detail = page.getByRole("region", { name: "낱말 설명" });
  await expect(detail.getByText("降る").first()).toBeVisible();
  await expect(
    detail.getByRole("link", { name: /네이버 사전에서 뜻 보기/ }),
  ).toHaveAttribute("href", /ja\.dict\.naver\.com\/#\/search\?query=/);

  // 박자 맞추기: 노래를 틀고 줄이 시작될 때마다 누른다
  if (isMobile)
    await page.getByRole("button", { name: "낱말 설명 닫기" }).click();
  await page.getByRole("link", { name: "박자 맞추기" }).first().click();
  await expect(page).toHaveURL("/songs/e2e-flow/sync");
  await expect(page.locator("html")).toHaveAttribute("data-tap-keys", "on");
  await page.getByRole("button", { name: "노래 틀기" }).click();
  await expect.poll(() => audioIsPlaying(page)).toBe(true);

  const tap = async () => {
    if (isMobile)
      await page.getByRole("button", { name: "지금 줄 시작" }).click();
    else await page.keyboard.press("Space");
  };
  for (const at of [0.5, 2, 3.5]) {
    await expect.poll(() => audioTime(page)).toBeGreaterThanOrEqual(at);
    await tap();
  }
  // PC에서 Space는 박자로만 쓰이고 재생을 멈추지 않는다
  expect(await audioIsPlaying(page)).toBe(true);
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByRole("status")).toHaveText("저장했습니다.");

  const saved = await (await page.request.get("/api/songs/e2e-flow")).json();
  const starts = saved.item.lines.map((l: { start?: number }) => l.start);
  expect(starts[3]).toBeUndefined();
  expect(starts[0]).toBeGreaterThanOrEqual(0.5);
  expect(starts[1]).toBeGreaterThan(starts[0]);
  expect(starts[2]).toBeGreaterThan(starts[1]);
  const third: number = starts[2];

  // 가사 화면에서 셋째 줄을 누르면 그 줄 시작으로 간다
  await page.getByRole("link", { name: "← 가사로" }).click();
  await expect(page).toHaveURL("/songs/e2e-flow");
  await expect.poll(() => audioTime(page)).toBeGreaterThanOrEqual(third + 2);
  await page.getByRole("button", { name: "3번째 줄부터 듣기" }).click();
  await expect.poll(() => audioTime(page)).toBeLessThan(third + 1.5);
  expect(await audioTime(page)).toBeGreaterThanOrEqual(third - 0.1);
  // 지금 부르는 줄을 강조한다
  await expect(lyrics.locator('li[aria-current="true"]')).toHaveAttribute(
    "data-line",
    "2",
  );
});
