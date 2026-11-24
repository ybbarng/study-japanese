import { expect, test } from "@playwright/test";
import { login } from "./helpers/auth";

// 출처 닫기는 서버 전체 설정을 바꾼다. 닫혀 있는 동안 같은 서버의 방문자 시험(강 화면·낱말 사전 등)이
// 403·404를 받아 깨지므로, 이 파일은 playwright.config.ts의 "-sources" 프로젝트에서 다른 시험이 모두
// 끝난 뒤에 따로 돈다(2026-11-24 낱말 사전 시험이 이 시험과 겹쳐 404를 받은 일).

const LECTURE_URL =
  "/media/ilmuta/1.%20%EC%9D%8C%EC%84%B1%20%EA%B0%95%EC%9D%98/L01.mp3";

test("관리자가 출처를 닫으면 방문자는 그 자료를 받지 못하고, 다시 열면 받는다", async ({
  page,
  browser,
}) => {
  await login(page, "/settings");
  const visitor = await browser.newContext();
  const toggle = page
    .getByRole("switch", { name: /무작정 따라하기.*공개/ })
    .first();
  try {
    await toggle.click();
    await expect(toggle).toHaveText("닫힘");
    expect((await visitor.request.get(LECTURE_URL)).status()).toBe(403);
    expect((await page.request.get(LECTURE_URL)).status()).toBe(200);

    await toggle.click();
    await expect(toggle).toHaveText("공개");
    expect((await visitor.request.get(LECTURE_URL)).status()).toBe(200);
  } finally {
    await visitor.close();
  }
});
