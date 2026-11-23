import { expect, test } from "@playwright/test";
import { E2E_PASSWORD, login } from "./helpers/auth";

const LECTURE_URL =
  "/media/ilmuta/1.%20%EC%9D%8C%EC%84%B1%20%EA%B0%95%EC%9D%98/L01.mp3";

test.describe("로그인 없이", () => {
  test("첫 화면을 열면 로그인 화면으로 넘어간다", async ({ page }) => {
    await page.goto("/ilmuta");
    await expect(page).toHaveURL("/login?next=%2Filmuta");
    await expect(page.getByPlaceholder("암호")).toBeVisible();
  });

  test("교재 오디오는 받을 수 없다(401)", async ({ request }) => {
    const res = await request.get(LECTURE_URL);
    expect(res.status()).toBe(401);
  });

  test("들은 기록 API는 받을 수 없다(401)", async ({ request }) => {
    const res = await request.get("/api/listen?book=ilmuta");
    expect(res.status()).toBe(401);
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

  test("맞는 암호면 가려던 화면으로 가고 오디오도 받을 수 있다", async ({
    page,
  }) => {
    await login(page, "/ilmuta");
    await expect(
      page.getByRole("heading", { name: "일본어 무작정 따라하기" }),
    ).toBeVisible();
    const res = await page.request.get(LECTURE_URL);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("audio/mpeg");
  });
});
