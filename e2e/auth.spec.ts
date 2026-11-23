import { expect, test } from "@playwright/test";
import { E2E_PASSWORD, login } from "./helpers/auth";

const LECTURE_URL =
  "/media/ilmuta/1.%20%EC%9D%8C%EC%84%B1%20%EA%B0%95%EC%9D%98/L01.mp3";

// 다른 시험이 L01 기록을 보므로, 서버 DB를 함께 쓰는 이 시험은 그와 겹치지 않는 항목을 쓴다
const LISTEN_EVENT = {
  clientId: "e2e-visitor-0001",
  book: "ilmuta",
  item: "auth-spec",
  kind: "lecture",
  startedAt: Date.UTC(2027, 0, 2),
  listenedSec: 3,
  completed: true,
};

test.describe("로그인하지 않은 방문자", () => {
  test("강 화면을 열고 교재 오디오를 들을 수 있다", async ({ page }) => {
    await page.goto("/ilmuta");
    await expect(page).toHaveURL("/ilmuta");
    const res = await page.request.get(LECTURE_URL);
    expect(res.status()).toBe(200);
  });

  test("학습 기록을 서버에 남기거나 내보낼 수 없다(401)", async ({
    request,
  }) => {
    const write = await request.post("/api/listen", {
      data: { events: [LISTEN_EVENT] },
    });
    expect(write.status()).toBe(401);
    expect((await request.get("/api/export")).status()).toBe(401);
  });

  test("설정 화면은 로그인 화면으로 넘어간다", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL("/login?next=%2Fsettings");
  });

  test("검색엔진 수집을 막는다", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /");
  });
});

test.describe("로그인", () => {
  test("틀린 암호면 들어가지 못하고 다시 묻는다", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("암호").fill(`${E2E_PASSWORD}-wrong`);
    await page.getByRole("button", { name: "들어가기" }).click();
    await expect(page.getByText("암호가 맞지 않습니다.")).toBeVisible();
    await expect(page).toHaveURL(/\/login\?error=1/);
  });

  test("맞는 암호면 가려던 화면으로 가고 기록을 남길 수 있다", async ({
    page,
  }) => {
    await login(page, "/ilmuta");
    await expect(page).toHaveURL("/ilmuta");
    const write = await page.request.post("/api/listen", {
      data: { events: [{ ...LISTEN_EVENT, clientId: "e2e-admin-0001" }] },
    });
    expect(write.status()).toBe(200);
  });

  test("관리자가 출처를 닫으면 방문자는 그 자료를 받지 못하고, 다시 열면 받는다", async ({
    page,
    browser,
  }) => {
    await login(page, "/settings");
    const visitor = await browser.newContext();
    try {
      await page
        .getByRole("switch", { name: /무작정 따라하기.*공개/ })
        .first()
        .click();
      await expect(
        page.getByRole("switch", { name: /무작정 따라하기.*공개/ }).first(),
      ).toHaveText("닫힘");
      expect((await visitor.request.get(LECTURE_URL)).status()).toBe(403);
      expect((await page.request.get(LECTURE_URL)).status()).toBe(200);

      await page
        .getByRole("switch", { name: /무작정 따라하기.*공개/ })
        .first()
        .click();
      await expect(
        page.getByRole("switch", { name: /무작정 따라하기.*공개/ }).first(),
      ).toHaveText("공개");
      expect((await visitor.request.get(LECTURE_URL)).status()).toBe(200);
    } finally {
      await visitor.close();
    }
  });
});
