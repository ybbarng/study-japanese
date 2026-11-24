import {
  type BrowserContext,
  expect,
  type Locator,
  type Page,
  test,
} from "@playwright/test";
import {
  ILMUNTA_LECTURE_CUES,
  ILMUNTA_PAIR,
  ILMUNTA_PAIR_LESSON,
  LONG_LECTURE,
  LONG_LECTURE_BOOKLET,
  LONG_LECTURE_CUES,
  QUIZ_LESSON,
} from "./fixtures/textbook";
import { TAP_WORD } from "./fixtures/word-tap";
import { login } from "./helpers/auth";
import { audioIsPlaying, listenSummary } from "./helpers/listen";
import { optionIndex, rightLabel, wordsQuiz } from "./helpers/quiz";

const UNSAVED_AUDIO =
  "/media/ilmuta/1.%20%EC%9D%8C%EC%84%B1%20%EA%B0%95%EC%9D%98/L03.mp3";

/** service worker가 이 화면을 맡을 때까지 기다린다(빌드한 앱에서만 등록된다) */
async function waitForServiceWorker(page: Page) {
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller);
}

async function saveLesson(page: Page, no: number) {
  await login(page, `/ilmuta/${no}`);
  await waitForServiceWorker(page);
  const box = page.getByRole("region", { name: "이 강 받아 두기" });
  await box.getByRole("button", { name: "받기" }).click();
  await expect(box).toContainText(/받아 둠 · \d/, { timeout: 20_000 });
  return box;
}

test("받아 둔 강은 통신이 끊겨도 화면이 열리고 강의가 재생되며, 들은 기록은 다시 연결되면 서버에 남는다", async ({
  page,
  context,
}) => {
  await saveLesson(page, 2);
  // 받을 때 브라우저 HTTP 캐시에도 남는다(오디오는 max-age 하루). 그것이 대신 소리를 내지 않게 비워,
  // 앱이 넣은 Cache Storage에서만 나오는지 본다
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.clearBrowserCache");

  await context.setOffline(true);
  // 끊긴 것이 service worker에도 걸렸는지: 받아 두지 않은 오디오는 받을 수 없어야 한다
  const unsaved = await page.evaluate(
    (url) =>
      fetch(url).then(
        (r) => r.status,
        () => "failed",
      ),
    UNSAVED_AUDIO,
  );
  expect(unsaved).toBe("failed");

  const response = await page.reload();
  expect(response?.fromServiceWorker()).toBe(true);
  await expect(
    page.getByRole("heading", { level: 1, name: "テスト2だ。" }),
  ).toBeVisible();

  await page.getByRole("button", { name: /강의 듣기/ }).click();
  await expect.poll(() => audioIsPlaying(page)).toBe(true);
  // 재생 막대가 받아 둔 트랙임을 알려 준다(터널 들어가기 전 안심용)
  await expect(
    page.getByRole("button", { name: "재생 화면 펼치기" }),
  ).toContainText("받아 둠");
  // 3초짜리 강의가 끝나 다음 예문으로 넘어갈 때까지 기다린다(기록은 폰 대기열에 쌓인다)
  await expect(
    page.getByRole("button", { name: "재생 화면 펼치기" }),
  ).toContainText("2강 기본 회화 듣기", { timeout: 15_000 });

  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect
    .poll(
      async () => (await listenSummary(page, "ilmuta", "L02"))?.completedPlays,
      {
        timeout: 15_000,
      },
    )
    .toBe(1);
});

/** 앱이 넣은 캐시(Cache Storage)의 주소 경로들 */
function cachedPaths(page: Page, cache: string): Promise<string[]> {
  return page.evaluate(
    async (name) =>
      (await (await caches.open(name)).keys()).map(
        (r) => new URL(r.url).pathname,
      ),
    cache,
  );
}

/** 끊기기 전 브라우저 HTTP 캐시를 비우고 끊는다(앱이 받아 둔 Cache Storage에서만 나오는지 보려고) */
async function goOffline(page: Page, context: BrowserContext) {
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.clearBrowserCache");
  await context.setOffline(true);
}

/** 그림이 실제로 그려졌는지(파일을 받지 못하면 naturalWidth가 0) */
function imageLoaded(img: Locator): Promise<boolean> {
  return img.evaluate(
    (el) =>
      (el as HTMLImageElement).complete &&
      (el as HTMLImageElement).naturalWidth > 0,
  );
}

test("받아 둔 강은 통신이 끊겨도 낱말 그림·장면 그림이 나오고, 확인 문제의 다시 듣기 소리가 난다", async ({
  page,
  context,
}) => {
  await saveLesson(page, QUIZ_LESSON);
  // 받기는 자막(확인 문제 소리 구간)과 그 강의 그림까지 받아 둔다
  expect(await cachedPaths(page, "sj-data-v1")).toContain(
    `/api/transcripts/ilmuta/0${QUIZ_LESSON}-2`,
  );
  const pictures = await cachedPaths(page, "sj-pictures-v1");
  expect(pictures).toContain("/pictures/words/river.svg");
  // 장면 그림도 받는다(가짜 교재에는 회화 단계가 없어 화면에는 나오지 않으므로 파일로 본다)
  const scene = pictures.find((p) => p.startsWith("/pictures/scenes/"));
  expect(scene).toBeDefined();

  await goOffline(page, context);
  const response = await page.reload();
  expect(response?.fromServiceWorker()).toBe(true);

  const river = page.locator(
    '#step-words img[src="/pictures/words/river.svg"]',
  );
  await river.first().scrollIntoViewIfNeeded();
  await expect.poll(() => imageLoaded(river.first())).toBe(true);
  const sceneStatus = await page.evaluate(
    (url) =>
      fetch(url).then(
        (r) => r.status,
        () => "failed",
      ),
    scene ?? "",
  );
  expect(sceneStatus).toBe(200);

  // 틀리면 "그 문장 다시 듣기"가 보인다: 받아 둔 자막에서 소리 구간을 찾았다는 뜻이다
  const quiz = wordsQuiz(page);
  await quiz.scrollIntoViewIfNeeded();
  await expect(quiz.getByText("1 / 3")).toBeAttached();
  const right = await rightLabel(quiz);
  await quiz
    .locator("ul li button")
    .nth(await optionIndex(quiz, right, false))
    .click();
  const replay = quiz.getByRole("button", { name: "▶ 그 문장 다시 듣기" });
  await expect(replay).toBeVisible();
  await replay.click();
  await expect(quiz.getByRole("button", { name: "듣는 중…" })).toBeVisible();
});

test("받아 둔 강은 통신이 끊겨도 펼친 재생 화면에 자막 카드가 뜨고, 예문 낱말 정보 창이 열린다", async ({
  page,
  context,
}) => {
  await saveLesson(page, LONG_LECTURE.no);
  await goOffline(page, context);
  await page.reload();

  // 예문 mp3의 자막도 받아 두어, 끊겨도 자막 API가 받아 둔 것을 준다
  const example = await page.evaluate(() =>
    fetch("/api/transcripts/ilmuta/03-3").then(
      async (r) => ({
        status: r.status,
        ja: (await r.json()).segments?.length,
      }),
      () => "failed",
    ),
  );
  expect(example).toEqual({ status: 200, ja: 3 });

  await page
    .getByRole("button", { name: /강의 듣기/ })
    .first()
    .click();
  await expect.poll(() => audioIsPlaying(page)).toBe(true);
  await page.evaluate((s) => {
    const a = document.querySelector("audio");
    if (a) a.currentTime = s;
  }, LONG_LECTURE_CUES[1].start + 1);
  // 펼친 재생 화면은 따로 불러오는 코드 덩어리다. 끊겨도 펼쳐지고 받아 둔 자막에서 카드를 띄운다
  await page
    .getByRole("button", { name: "재생 화면 펼치기" })
    .locator("visible=true")
    .first()
    .click();
  const expanded = page.getByRole("dialog", { name: "재생 화면" });
  await expect(
    expanded
      .getByText(LONG_LECTURE_BOOKLET.ko, { exact: true })
      .locator("visible=true")
      .first(),
  ).toBeVisible();
  await expanded.getByRole("button", { name: "접기" }).click();

  await page.locator("#step-patterns [data-word-tap]").first().click();
  await expect(page.locator("[data-word-panel]")).toContainText(TAP_WORD.gloss);
});

test("받아 둔 일문따 과는 통신이 끊겨도 화면이 열리고 강의 자막 카드가 뜬다", async ({
  page,
  context,
}) => {
  await login(page, `/ilmunta/${ILMUNTA_PAIR_LESSON.no}`);
  await waitForServiceWorker(page);
  const box = page.getByRole("region", { name: "이 강 받아 두기" });
  await box.getByRole("button", { name: "받기" }).click();
  await expect(box).toContainText(/받아 둠 · \d/, { timeout: 20_000 });

  await goOffline(page, context);
  const response = await page.reload();
  expect(response?.fromServiceWorker()).toBe(true);
  await page.getByRole("button", { name: /처음부터 듣기|이어서 듣기/ }).click();
  await expect.poll(() => audioIsPlaying(page)).toBe(true);
  await page.evaluate((s) => {
    const a = document.querySelector("audio");
    if (a) a.currentTime = s;
  }, ILMUNTA_LECTURE_CUES[1].start + 1);
  await expect(
    page
      .getByText(ILMUNTA_PAIR.ko, { exact: true })
      .locator("visible=true")
      .first(),
  ).toBeVisible();
});

test("받아 둔 강 화면에 받은 강과 크기가 보이고, 지우면 강 화면이 다시 받기로 돌아간다", async ({
  page,
}) => {
  await saveLesson(page, 3);

  await page.goto("/offline");
  const row = page.getByRole("listitem").filter({ hasText: "テスト3だ。" });
  await expect(row).toContainText("일무따");
  await expect(row).toContainText(/\d+(\.\d)?MB/);
  await row.getByRole("button", { name: /지우기/ }).click();
  await expect(page.getByText("아직 받아 둔 강이 없습니다")).toBeVisible();

  await page.goto("/ilmuta/3");
  await expect(
    page
      .getByRole("region", { name: "이 강 받아 두기" })
      .getByRole("button", { name: "받기" }),
  ).toBeVisible();
});
