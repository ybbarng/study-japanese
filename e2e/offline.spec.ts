import { expect, type Page, test } from "@playwright/test";
import { login } from "./helpers/auth";
import { audioIsPlaying, listenSummary } from "./helpers/listen";

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
