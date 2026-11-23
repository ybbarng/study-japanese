import type { Page } from "@playwright/test";

/** E2E 서버에만 쓰는 시험 암호(playwright.config.ts가 SITE_PASSWORD로 넘긴다) */
export const E2E_PASSWORD = "e2e-only-password";

/** 로그인 화면에서 암호를 넣고 들어가, `next` 화면에 닿을 때까지 기다린다 */
export async function login(page: Page, next = "/") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByPlaceholder("암호").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "들어가기" }).click();
  const target = next.split("?")[0];
  await page.waitForURL((url) => url.pathname === target);
}
