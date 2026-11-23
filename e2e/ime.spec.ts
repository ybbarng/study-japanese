import { expect, test } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("입력기 안내", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "/ime");
  });

  test("안드로이드 폰으로 열면 Gboard 안내가 맨 위에 펼쳐져 있다", async ({
    page,
  }) => {
    const guides = page.locator("details[data-device]");
    await expect(guides.first()).toHaveAttribute("data-device", "android");
    await expect(guides.first()).toHaveAttribute("open", "");
    await expect(
      page.locator('details[data-device="windows"]'),
    ).not.toHaveAttribute("open", "");
  });

  test("시험 칸에 로마자만 들어오면 아직, 가나가 들어오면 입력기 준비됨을 보인다", async ({
    page,
  }) => {
    const box = page.getByLabel("입력기 시험 칸");
    const status = page.getByRole("status");
    await box.fill("nihongo");
    await expect(status).toContainText("로마자 그대로 들어옵니다");
    await box.fill("にほんご");
    await expect(status).toHaveText("입력기 준비됨 — 일본어가 들어옵니다");
  });

  test("첫 화면의 링크로 이 화면에 온다", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "일본어 입력기 켜는 법" }).click();
    await expect(
      page.getByRole("heading", { name: "일본어 입력기 켜기" }),
    ).toBeVisible();
  });
});
