import { expect, test } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("입력기 안내", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "/ime");
  });

  test("접속한 기기의 안내가 맨 위에 펼쳐져 있다(안드로이드 폰은 Gboard, 윈도우 PC는 Microsoft IME)", async ({
    page,
  }, testInfo) => {
    // 폰 프로젝트는 Pixel 7(안드로이드), PC 프로젝트는 Desktop Chrome(윈도우) 브라우저로 연다
    const [mine, other] =
      testInfo.project.name === "desktop-chrome"
        ? ["windows", "android"]
        : ["android", "windows"];
    const guides = page.locator("details[data-device]");
    await expect(guides.first()).toHaveAttribute("data-device", mine);
    await expect(guides.first()).toHaveAttribute("open", "");
    await expect(
      page.locator(`details[data-device="${other}"]`),
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
